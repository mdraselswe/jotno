/**
 * Quick help (৳99 short question) as plain functions. Times are UTC Dates,
 * duty hours are minutes from midnight in Dhaka.
 *
 *   pending_payment ──paid──▶ open ──first on-duty vet answers──▶ claimed (a short chat)
 *                              └──nobody in `answerMinutes`──▶ credited (free retry) ──or──▶ refunded
 */
export type QuickStatus =
  "pending_payment" | "open" | "claimed" | "credited" | "used" | "refunded" | "cancelled";

/** Whether `minute` falls in a duty window; an end before the start runs past midnight. */
export function inDutyWindow(minute: number, start: number | null, end: number | null): boolean {
  if (start === null || end === null) return false;
  if (start === end) return true; // all day
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

export interface DutyInput {
  availableNow: boolean;
  availableUntil: Date | null;
  dutyStart: number | null;
  dutyEnd: number | null;
}

/** On duty now: "available now" is on, or it is inside the vet's duty hours. */
export function onDuty(v: DutyInput, now: Date, dhakaMinute: number): boolean {
  if (v.availableNow && (v.availableUntil === null || v.availableUntil > now)) return true;
  return inDutyWindow(dhakaMinute, v.dutyStart, v.dutyEnd);
}

/** Jotno's share of a quick help: the fee minus what the vet earns. */
export function quickCommission(fee: number, vetShare: number): number {
  return Math.max(0, fee - vetShare);
}

/** Minutes left before nobody-answered (0 when over, null when not waiting). */
export function minutesLeft(
  r: { status: QuickStatus; openedAt: Date | null },
  now: Date,
  answerMinutes: number,
): number | null {
  if (r.status !== "open" || !r.openedAt) return null;
  const left = answerMinutes - (now.getTime() - r.openedAt.getTime()) / 60_000;
  return Math.max(0, Math.ceil(left));
}

/** Open for longer than the answer window: becomes a credit. */
export function isUnanswered(
  r: { status: QuickStatus; openedAt: Date | null },
  now: Date,
  answerMinutes: number,
): boolean {
  return minutesLeft(r, now, answerMinutes) === 0;
}

/** What the owner pays to turn a quick chat into the vet's full chat (at least ৳1). */
export function upgradeFee(vetFee: number, quickFee: number): number {
  return Math.max(100, vetFee - quickFee);
}

/** Owner's follow-ups in a quick chat are limited; a full chat has no limit. */
export function ownerCanSend(kind: "full" | "quick", sentAfterAnswer: number, limit: number): boolean {
  return kind === "full" || sentAfterAnswer < limit;
}

/** "HH:MM" → minutes from midnight (null when empty or wrong). */
export function parseClock(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes from midnight → "HH:MM". */
export function formatClock(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
