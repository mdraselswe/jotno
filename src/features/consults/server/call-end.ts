import "server-only";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";
import { site } from "@/config";
import { db, schema } from "@/infrastructure/db";
import type { EndReason } from "../calls";
import { pushMissed, signalConsult, signalUser } from "./call-signal";
import { finishCall } from "./call-store";
import { participant } from "./participant";

const K = schema.calls;
const uuid = z.uuid();

/** The call and the viewer's side of its consult, or null if they aren't in it. */
export async function callFor(callId: string, userId: string) {
  if (!uuid.safeParse(callId).success) return null;
  const [call] = await db().select().from(K).where(eq(K.id, callId)).limit(1);
  if (!call) return null;
  const p = await participant(call.consultId, userId);
  return p ? { call, p } : null;
}

/**
 * Ends a call for a signed-in participant (the endCall action, and the Decline
 * button on a call notification via /api/calls/decline). Tells both people's
 * other pages it's over, tells an open chat page about a decline, and sends the
 * callee a missed-call push when the caller gave up.
 */
export async function endCallAs(
  viewer: { id: string; fullName: string | null },
  locale: string,
  callId: string,
  reason: EndReason,
): Promise<{ ok: boolean }> {
  const found = await callFor(callId, viewer.id);
  if (!found) return { ok: false };
  const { call, p } = found;
  const done = await finishCall(call, reason, viewer.id);
  if (!done) return { ok: true };
  const over = { state: "over", callId, consultId: call.consultId, status: done.status } as const;
  after(async () => {
    await Promise.all([signalUser(viewer.id, over), signalUser(p.otherId, over)]);
    // A decline from the popup or the notification: the caller's chat page stops ringing.
    if (reason === "decline") await signalConsult(call.consultId, { kind: "decline", callId });
    if (done.status === "missed" && call.callerId === viewer.id) {
      const name = (p.role === "vet" ? p.vetName : viewer.fullName) ?? site.name;
      await pushMissed(p.otherId, locale, call, name);
    }
  });
  return { ok: true };
}
