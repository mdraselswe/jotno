/**
 * Pure helpers for the chat screen: merge messages in order, group them like a
 * messaging app (same sender, a few minutes apart), add day separators, find
 * links and emoji-only messages. No React, so they are unit-tested.
 */

export interface ThreadMessage {
  id: string;
  /** null for system lines ("system:opened", call lines…). */
  senderId: string | null;
  body: string | null;
  hasImage: boolean;
  readAt: string | null;
  /** ISO instant (UTC). */
  createdAt: string;
}

/** Messages from one sender closer than this join into one group. */
export const GROUP_GAP_MS = 5 * 60_000;

/** Where a bubble sits in its group: corners and the avatar follow from it. */
export type BubblePosition = "single" | "first" | "middle" | "last";

export type ThreadRow<M extends ThreadMessage> =
  | { kind: "day"; key: string; day: string }
  | { kind: "system"; key: string; message: M }
  | { kind: "message"; key: string; message: M; mine: boolean; position: BubblePosition };

const byTime = (a: ThreadMessage, b: ThreadMessage) =>
  a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt);

/**
 * Adds or replaces messages by id and keeps them in time order. Used for live
 * messages, a message's own send result and a refetch after a reconnect, so a
 * message that arrives twice is shown once.
 */
export function mergeMessages<M extends ThreadMessage>(current: readonly M[], incoming: readonly M[]): M[] {
  if (incoming.length === 0) return current.slice();
  const map = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort(byTime);
}

/** The calendar day ("YYYY-MM-DD") of an instant in a time zone. */
export function dayKey(instant: Date, timeZone: string): string {
  return dayFormatter(timeZone)(instant);
}

function dayFormatter(timeZone: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return (d: Date) => {
    const parts = f.formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  };
}

/** "today" / "yesterday" for a day key, or null for an older (or future) day. */
export function relativeDay(day: string, today: string): "today" | "yesterday" | null {
  if (day === today) return "today";
  const y = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  return day === y ? "yesterday" : null;
}

/** Rows to render: day separators, system lines and grouped bubbles. */
export function buildThread<M extends ThreadMessage>(
  messages: readonly M[],
  viewerId: string,
  timeZone: string,
): ThreadRow<M>[] {
  const toDay = dayFormatter(timeZone);
  const days = messages.map((m) => toDay(new Date(m.createdAt)));
  const joins = (a: M | undefined, b: M | undefined, ia: number, ib: number) =>
    Boolean(
      a &&
      b &&
      a.senderId !== null &&
      a.senderId === b.senderId &&
      days[ia] === days[ib] &&
      Math.abs(Date.parse(b.createdAt) - Date.parse(a.createdAt)) <= GROUP_GAP_MS,
    );

  const rows: ThreadRow<M>[] = [];
  let lastDay: string | null = null;
  messages.forEach((m, i) => {
    const day = days[i] ?? "";
    if (day !== lastDay) {
      rows.push({ kind: "day", key: `day-${day}`, day });
      lastDay = day;
    }
    if (m.senderId === null) {
      rows.push({ kind: "system", key: m.id, message: m });
      return;
    }
    const withPrev = joins(messages[i - 1], m, i - 1, i);
    const withNext = joins(m, messages[i + 1], i, i + 1);
    const position: BubblePosition = withPrev
      ? withNext
        ? "middle"
        : "last"
      : withNext
        ? "first"
        : "single";
    rows.push({ kind: "message", key: m.id, message: m, mine: m.senderId === viewerId, position });
  });
  return rows;
}

export interface TextPart {
  text: string;
  /** Set for a web link (always http or https). */
  href?: string;
}

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"]+[^\s<>"'.,:;!?)\]}])/gi;

/** Splits text into plain parts and web links (http/https only; "www." gets https). */
export function linkify(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const raw = match[0];
    const start = match.index;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: raw, href: raw.toLowerCase().startsWith("www.") ? `https://${raw}` : raw });
    last = start + raw.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|‍|️|\s)+$/u;

/** One to three emoji and nothing else: shown large, without a bubble. */
export function isEmojiOnly(text: string | null): boolean {
  const s = text?.trim() ?? "";
  if (!s || !EMOJI_ONLY.test(s)) return false;
  const count = (s.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  const flags = (s.match(/\p{Regional_Indicator}/gu) ?? []).length / 2;
  const n = count + flags;
  return n >= 1 && n <= 3;
}

/** How many messages from the other side came after the given index. */
export function countFromOthers(
  messages: readonly ThreadMessage[],
  viewerId: string,
  fromIndex: number,
): number {
  let n = 0;
  for (let i = Math.max(0, fromIndex); i < messages.length; i++) {
    const m = messages[i];
    if (m?.senderId && m.senderId !== viewerId) n++;
  }
  return n;
}
