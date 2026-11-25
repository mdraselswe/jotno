import "server-only";
import { and, eq, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { business, site } from "@/config";
import { db, schema } from "@/infrastructure/db";
import { callLine, countsAsReply, endStatus, talkSeconds, type EndReason } from "../calls";
import { callSides, pushMissed, signalUser } from "./call-signal";

const K = schema.calls;
const OPEN = ["ringing", "active"] as const;

type CallRow = typeof K.$inferSelect;

/**
 * Ends a ringing/active call once (the update only matches an open call, so a
 * second hang-up or the cron finishing it too is harmless) and leaves a line in
 * the chat ("Video call · 4:05", "Missed audio call").
 */
export async function finishCall(
  call: Pick<CallRow, "id" | "consultId" | "media" | "answeredAt">,
  reason: EndReason,
  endedBy: string | null,
  endedAt = new Date(),
): Promise<CallRow | null> {
  const status = endStatus(call.answeredAt !== null, reason);
  const seconds = talkSeconds(call.answeredAt, endedAt);
  // One transaction: the refund cron never sees the call ended before it counts as the reply.
  const done = await db().transaction(async (tx) => {
    const [row] = await tx
      .update(K)
      .set({ status, endedAt, endedBy, endReason: reason })
      .where(and(eq(K.id, call.id), inArray(K.status, [...OPEN])))
      .returning();
    if (!row) return null;
    await tx
      .insert(schema.messages)
      .values({ consultId: call.consultId, senderId: null, body: callLine(call.media, status, seconds) });
    // Talking long enough on a call is the vet's reply (no "vet didn't reply" refund).
    if (call.answeredAt && countsAsReply(status, seconds, business.consult.call.replySeconds)) {
      await tx
        .update(schema.consults)
        .set({ firstReplyAt: call.answeredAt })
        .where(
          and(
            eq(schema.consults.id, call.consultId),
            eq(schema.consults.status, "active"),
            isNull(schema.consults.firstReplyAt),
          ),
        );
    }
    return row;
  });
  if (!done) return null;
  return done;
}

/** Ends every open call of a consult (the chat closed, or a new call replaces a stuck one). */
export async function endOpenCalls(consultId: string, reason: EndReason): Promise<number> {
  const open = await db()
    .select()
    .from(K)
    .where(and(eq(K.consultId, consultId), inArray(K.status, [...OPEN])));
  let n = 0;
  for (const c of open) if (await finishCall(c, reason, null)) n += 1;
  return n;
}

/**
 * Cron: unanswered rings become missed; active calls with no heartbeat end at
 * their last heartbeat (so the length stays true); calls in a closed chat end.
 */
export async function runCallJobs(): Promise<{ missed: number; stale: number; closed: number }> {
  const { ringSeconds, staleSeconds } = business.consult.call;
  const now = Date.now();

  const rings = await db()
    .select()
    .from(K)
    .where(and(eq(K.status, "ringing"), lte(K.createdAt, new Date(now - ringSeconds * 1000))))
    .limit(100);
  let missed = 0;
  for (const c of rings) {
    const done = await finishCall(c, "no_answer", null);
    if (!done) continue;
    missed += 1;
    // The caller's tab died while ringing: the callee still hears about the missed call.
    const sides = await callSides(c.consultId, c.callerId);
    if (!sides) continue;
    const over = { state: "over", callId: c.id, consultId: c.consultId, status: done.status } as const;
    await signalUser(sides.calleeId, over);
    if (c.callerId) await signalUser(c.callerId, over);
    await pushMissed(sides.calleeId, site.i18n.defaultLocale, c, sides.callerName);
  }

  const stuck = await db()
    .select()
    .from(K)
    .where(
      and(
        eq(K.status, "active"),
        sql`coalesce(${K.lastBeatAt}, ${K.answeredAt}) <= ${new Date(now - staleSeconds * 1000).toISOString()}::timestamptz`,
      ),
    )
    .limit(100);
  let stale = 0;
  for (const c of stuck)
    if (await finishCall(c, "stale", null, c.lastBeatAt ?? c.answeredAt ?? new Date())) stale += 1;

  const orphaned = await db()
    .select({ call: K })
    .from(K)
    .innerJoin(schema.consults, eq(schema.consults.id, K.consultId))
    .where(and(inArray(K.status, [...OPEN]), ne(schema.consults.status, "active")))
    .limit(100);
  let closed = 0;
  for (const { call } of orphaned) if (await finishCall(call, "consult_closed", null)) closed += 1;

  return { missed, stale, closed };
}
