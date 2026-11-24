import "server-only";
import { eq, sql } from "drizzle-orm";
import { site } from "@/config";
import { chatPath } from "@/config/routes";
import { notify } from "@/features/notifications/server";
import { translator } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { localeHref } from "@/lib/locale-href";
import { answerUrl, type CallMedia, type CallStatus } from "../calls";

/**
 * Realtime call signals sent by the server (supabase `realtime.send`, private topics):
 *   "user:<id>"     rings that person on every page (IncomingCall in the layout)
 *   "consult:<id>"  tells an open chat page the call ended (a decline from the popup)
 * Never throws: a lost signal only means the push or the chat page catches up.
 */
export type UserCallSignal =
  | { state: "ringing"; callId: string; consultId: string; media: CallMedia; name: string; at: number }
  | { state: "over"; callId: string; consultId: string; status: CallStatus };

async function send(topic: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await db().execute(sql`select realtime.send(${JSON.stringify(payload)}::jsonb, 'call', ${topic}, true)`);
  } catch (error) {
    console.error("realtime.send failed", topic, error);
  }
}

export function signalUser(userId: string, payload: UserCallSignal): Promise<void> {
  return send(`user:${userId}`, payload);
}

export function signalConsult(consultId: string, payload: Record<string, unknown>): Promise<void> {
  return send(`consult:${consultId}`, payload);
}

/** The ringing push: call-style on phones (Answer / Decline, keeps ringing until tapped). */
export async function pushRing(
  userId: string,
  locale: string,
  call: { id: string; consultId: string; media: CallMedia },
  name: string,
  ringSeconds: number,
): Promise<void> {
  const t = translator(locale);
  await notify(userId, "consult.call", {
    title: t("call.push.ringTitle", { name, media: t(`call.media.${call.media}`) }),
    body: t("call.push.ringBody"),
    url: answerUrl(localeHref(locale, chatPath(call.consultId)), call.id),
    tag: `call-${call.consultId}`,
    kind: "call",
    callId: call.id,
    locale,
    ttl: ringSeconds,
    actions: { answer: t("call.accept"), decline: t("call.decline") },
  });
}

/** "Missed audio call from Dr Nusrat": replaces the ringing notification (same tag). */
export async function pushMissed(
  userId: string,
  locale: string,
  call: { consultId: string; media: CallMedia },
  name: string,
): Promise<void> {
  const t = translator(locale);
  await notify(userId, "consult.missedCall", {
    title: t("call.push.missedTitle", { name, media: t(`call.media.${call.media}`) }),
    body: t("call.push.missedBody"),
    url: localeHref(locale, chatPath(call.consultId)),
    tag: `call-${call.consultId}`,
  });
}

/**
 * Who a call rang and who placed it, for the cron (no viewer): the callee is the
 * side of the consult that isn't the caller; the caller's name is the vet's
 * display name or the owner's full name.
 */
export async function callSides(
  consultId: string,
  callerId: string | null,
): Promise<{ calleeId: string; callerName: string } | null> {
  const C = schema.consults;
  const P = schema.providers;
  const rows = await db()
    .select({
      ownerId: C.ownerId,
      vetId: P.profileId,
      vetName: P.displayName,
      ownerName: schema.profiles.fullName,
    })
    .from(C)
    .innerJoin(P, eq(P.id, C.providerId))
    .leftJoin(schema.profiles, eq(schema.profiles.id, C.ownerId))
    .where(eq(C.id, consultId))
    .limit(1);
  const r = rows[0];
  if (!r || !callerId) return null;
  const callerIsVet = callerId === r.vetId;
  return {
    calleeId: callerIsVet ? r.ownerId : r.vetId,
    callerName: (callerIsVet ? r.vetName : r.ownerName) ?? site.name,
  };
}
