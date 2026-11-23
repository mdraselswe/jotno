"use server";

import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";
import { business } from "@/config";
import { chatPath } from "@/config/routes";
import { actionViewer } from "@/features/auth/server";
import { notify } from "@/features/notifications/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { rateLimit } from "@/infrastructure/db/helpers";
import { iceServers, type IceServer } from "@/infrastructure/turn";
import { localeHref } from "@/lib/locale-href";
import { END_REASONS, ringExpired, type CallMedia } from "../calls";
import { canSend } from "../rules";
import { endOpenCalls, finishCall } from "./call-store";
import { participant } from "./participant";

const K = schema.calls;
const uuid = z.uuid();
type Fail = { ok: false; error: MessageKey };

async function callFor(callId: string, userId: string) {
  if (!uuid.safeParse(callId).success) return null;
  const [call] = await db().select().from(K).where(eq(K.id, callId)).limit(1);
  if (!call) return null;
  const p = await participant(call.consultId, userId);
  return p ? { call, p } : null;
}

/** Rings the other side of an open consult. Returns the call id and ICE servers. */
export async function startCall(
  locale: string,
  consultId: string,
  media: CallMedia,
): Promise<{ ok: true; callId: string; ice: IceServer[] } | Fail> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  if (!business.consult.call.enabled || (media !== "audio" && media !== "video"))
    return { ok: false, error: "common.notAllowed" };
  const p = await participant(consultId, viewer.id);
  if (!p) return { ok: false, error: "common.notAllowed" };
  if (!canSend(p.c)) return { ok: false, error: "consult.closedNote" };
  if (!(await rateLimit(`call:${viewer.id}`, 20, 600))) return { ok: false, error: "common.tooMany" };

  // The other side is already ringing us: answer that instead of crossing calls.
  const [incoming] = await db()
    .select({ id: K.id, createdAt: K.createdAt })
    .from(K)
    .where(and(eq(K.consultId, consultId), eq(K.status, "ringing")))
    .limit(1);
  if (incoming && !ringExpired(incoming.createdAt, new Date(), business.consult.call.ringSeconds))
    return { ok: false, error: "call.busy" };
  // Anything left open (a tab that died mid-call) ends before the new call.
  await endOpenCalls(consultId, "stale");

  const [call] = await db()
    .insert(K)
    .values({ consultId, callerId: viewer.id, media })
    .returning({ id: K.id });
  if (!call) return { ok: false, error: "common.genericError" };

  const name = (p.role === "vet" ? p.vetName : viewer.fullName) ?? "Jotno";
  const iceP = iceServers();
  // The caller sees the ringing screen at once; the push goes out after the response.
  after(() =>
    notify(p.otherId, "consult.call", {
      title:
        locale === "bn"
          ? `${name} ${media === "video" ? "ভিডিও" : "অডিও"} কল করছেন`
          : `${name} is calling (${media})`,
      body: locale === "bn" ? "ধরতে এখনই চ্যাট খুলুন।" : "Open the chat now to answer.",
      url: localeHref(locale, chatPath(consultId)),
      tag: `call-${consultId}`,
    }),
  );
  const { servers } = await iceP;
  return { ok: true, callId: call.id, ice: servers };
}

/** The other side picks up. */
export async function answerCall(callId: string): Promise<{ ok: true; ice: IceServer[] } | Fail> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const found = await callFor(callId, viewer.id);
  if (!found || found.call.callerId === viewer.id) return { ok: false, error: "common.notAllowed" };
  if (!canSend(found.p.c)) return { ok: false, error: "consult.closedNote" };
  const now = new Date();
  if (ringExpired(found.call.createdAt, now, business.consult.call.ringSeconds + 15))
    return { ok: false, error: "call.over" };
  const [done] = await db()
    .update(K)
    .set({ status: "active", answeredAt: now, lastBeatAt: now })
    .where(and(eq(K.id, callId), eq(K.status, "ringing")))
    .returning({ id: K.id });
  if (!done) return { ok: false, error: "call.over" };
  const { servers } = await iceServers();
  return { ok: true, ice: servers };
}

const endSchema = z.enum(END_REASONS as [string, ...string[]]);

/** Hang up, cancel, decline or report a failed connection. Safe to call twice. */
export async function endCall(locale: string, callId: string, reason: string): Promise<{ ok: boolean }> {
  const viewer = await actionViewer();
  const parsed = endSchema.safeParse(reason);
  if (!viewer || !parsed.success) return { ok: false };
  const found = await callFor(callId, viewer.id);
  if (!found) return { ok: false };
  const r = parsed.data as (typeof END_REASONS)[number];
  const done = await finishCall(found.call, r, viewer.id);
  // Tell the person who didn't pick up that they missed a call.
  if (done?.status === "missed" && found.call.callerId === viewer.id) {
    await notify(found.p.otherId, "consult.missedCall", {
      title: locale === "bn" ? "মিস কল" : "Missed call",
      body: locale === "bn" ? "চ্যাটে ফিরে কল ব্যাক করুন।" : "Open the chat to call back.",
      url: localeHref(locale, chatPath(found.call.consultId)),
      tag: `call-${found.call.consultId}`,
    });
  }
  return { ok: true };
}

/**
 * Every ~30 s while a call is up: keeps the length honest if a tab dies, and
 * records whether the media went through the TURN relay. Returns false when the
 * call is over on the server (the chat closed), so the page hangs up.
 */
export async function callBeat(callId: string, relayed: boolean | null): Promise<{ live: boolean }> {
  const viewer = await actionViewer();
  if (!viewer || !uuid.safeParse(callId).success) return { live: false };
  const found = await callFor(callId, viewer.id);
  if (!found) return { live: false };
  if (!canSend(found.p.c)) {
    await finishCall(found.call, "consult_closed", null);
    return { live: false };
  }
  const set: Partial<typeof K.$inferInsert> = { lastBeatAt: new Date() };
  if (relayed !== null) set.relayed = relayed || found.call.relayed === true;
  const [row] = await db()
    .update(K)
    .set(set)
    .where(and(eq(K.id, callId), eq(K.status, "active")))
    .returning({ id: K.id });
  return { live: Boolean(row) };
}

/** A call still ringing for this viewer (they opened the chat from the push). */
export async function pendingCall(
  consultId: string,
): Promise<{ callId: string; media: CallMedia; callerId: string | null } | null> {
  const viewer = await actionViewer();
  if (!viewer) return null;
  const p = await participant(consultId, viewer.id);
  if (!p) return null;
  const [call] = await db()
    .select()
    .from(K)
    .where(and(eq(K.consultId, consultId), eq(K.status, "ringing")))
    .limit(1);
  if (!call || call.callerId === viewer.id) return null;
  if (ringExpired(call.createdAt, new Date(), business.consult.call.ringSeconds)) return null;
  return { callId: call.id, media: call.media, callerId: call.callerId };
}
