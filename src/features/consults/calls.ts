import type { Translate } from "@/i18n";

/**
 * Call rules (audio/video inside a consult) as plain functions. Times are UTC Dates.
 *
 *   ringing ──answer──▶ active ──hang up / stale──▶ ended
 *      ├──caller cancels / no answer in time──▶ missed
 *      ├──callee says no──▶ declined
 *      └──couldn't connect──▶ failed
 */
export type CallStatus = "ringing" | "active" | "ended" | "missed" | "declined" | "failed";
export type CallMedia = "audio" | "video";
export type EndReason = "hangup" | "decline" | "cancel" | "no_answer" | "failed" | "stale" | "consult_closed";

export const END_REASONS: readonly EndReason[] = [
  "hangup",
  "decline",
  "cancel",
  "no_answer",
  "failed",
  "stale",
  "consult_closed",
];

/** The status a call ends in, from whether it was answered and why it ended. */
export function endStatus(answered: boolean, reason: EndReason): Exclude<CallStatus, "ringing" | "active"> {
  if (answered) return "ended";
  if (reason === "decline") return "declined";
  if (reason === "failed") return "failed";
  return "missed";
}

/** Whole seconds between answer and end (0 when it was never answered). */
export function talkSeconds(answeredAt: Date | null, endedAt: Date | null): number {
  if (!answeredAt || !endedAt) return 0;
  return Math.max(0, Math.round((endedAt.getTime() - answeredAt.getTime()) / 1000));
}

/**
 * A call both sides talked on for at least `replySeconds` is the vet's reply:
 * the chat then no longer gets the automatic "no reply" refund.
 */
export function countsAsReply(status: CallStatus, seconds: number, replySeconds: number): boolean {
  return status === "ended" && seconds >= replySeconds;
}

/** A ringing call nobody answered in time. */
export function ringExpired(createdAt: Date, now: Date, ringSeconds: number): boolean {
  return now.getTime() - createdAt.getTime() >= ringSeconds * 1000;
}

/** An active call with no heartbeat for `staleSeconds` (tab closed, phone died). */
export function isStale(lastBeatAt: Date | null, answeredAt: Date | null, now: Date, staleSeconds: number) {
  const last = lastBeatAt ?? answeredAt;
  if (!last) return false;
  return now.getTime() - last.getTime() >= staleSeconds * 1000;
}

/**
 * The chat line a finished call leaves behind, e.g. "system:call:video:ended:245".
 * Parsed back by `parseCallLine` so both sides (and the admin) see it in the chat.
 */
export function callLine(media: CallMedia, status: CallStatus, seconds: number): string {
  return `system:call:${media}:${status}:${Math.max(0, Math.round(seconds))}`;
}

export function parseCallLine(
  body: string | null,
): { media: CallMedia; status: CallStatus; seconds: number } | null {
  const m = /^system:call:(audio|video):(ringing|active|ended|missed|declined|failed):(\d+)$/.exec(
    body ?? "",
  );
  if (!m) return null;
  return { media: m[1] as CallMedia, status: m[2] as CallStatus, seconds: Number(m[3]) };
}

/** The chat link that answers a ringing call as soon as it opens ("/chat/<id>/?answer=<call>"). */
export function answerUrl(chatHref: string, callId: string): string {
  return `${chatHref.replace(/\/?$/, "/")}?answer=${encodeURIComponent(callId)}`;
}

/** Whether a page path is that consult's chat (any locale prefix, with or without "/"). */
export function isChatPage(pathname: string, consultId: string): boolean {
  return pathname.replace(/\/$/, "").endsWith(`/chat/${consultId}`);
}

/** "4:05" / "1:02:09" for a call length. */
export function clock(seconds: number, num?: (n: number) => string): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  const out = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
  // In the page language's digits (০:৪৪ in Bangla) when a formatter is given.
  return num ? out.replace(/\d/g, (d) => num(Number(d))) : out;
}

/**
 * In-app browsers (Facebook, Messenger, Instagram…) usually block the camera and
 * microphone. Many people in Bangladesh open links from Facebook, so tell them
 * to open the page in Chrome instead.
 */
export function isInAppBrowser(userAgent: string): boolean {
  return /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Line\/|MicroMessenger|; wv\)/i.test(userAgent);
}

/** The words for a call line ("Audio call · 4:05", "Missed video call"). */
export function callLineText(
  call: { media: CallMedia; status: CallStatus; seconds: number },
  t: Translate,
  num?: (n: number) => string,
): string {
  const media = t(`call.media.${call.media}`);
  if (call.status === "ended") return t("call.line.ended", { media, time: clock(call.seconds, num) });
  return t(
    call.status === "declined"
      ? "call.line.declined"
      : call.status === "failed"
        ? "call.line.failed"
        : "call.line.missed",
    { media },
  );
}
