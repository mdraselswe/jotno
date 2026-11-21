/**
 * Appointment slots from weekly opening hours, as plain functions.
 * Opening hours are minutes from midnight in Dhaka time (UTC+6, no daylight
 * saving), so slots are computed without a time-zone library.
 */
import { dhakaDay, dhakaInstant, dhakaWeekday } from "@/lib/dhaka";

export { DHAKA_OFFSET_MIN, dhakaDay, dhakaInstant, dhakaWeekday } from "@/lib/dhaka";

export interface OpeningHours {
  /** 0 = Sunday … 6 = Saturday (Dhaka). */
  weekday: number;
  startMinute: number;
  endMinute: number;
  slotMinutes: number;
}

/**
 * Free slots on a Dhaka day. `taken` are start instants already booked.
 * Slots that start within `leadMinutes` from now are not offered.
 */
export function freeSlots(
  day: string,
  hours: OpeningHours[],
  taken: Date[],
  now: Date,
  leadMinutes = 60,
): { start: Date; end: Date }[] {
  const weekday = dhakaWeekday(day);
  const takenSet = new Set(taken.map((d) => d.getTime()));
  const earliest = now.getTime() + leadMinutes * 60_000;
  const result: { start: Date; end: Date }[] = [];
  for (const h of hours.filter((x) => x.weekday === weekday).sort((a, b) => a.startMinute - b.startMinute)) {
    if (h.slotMinutes <= 0) continue;
    for (let m = h.startMinute; m + h.slotMinutes <= h.endMinute; m += h.slotMinutes) {
      const start = dhakaInstant(day, m);
      if (start.getTime() < earliest || takenSet.has(start.getTime())) continue;
      result.push({ start, end: new Date(start.getTime() + h.slotMinutes * 60_000) });
    }
  }
  return result;
}

/** The next `count` Dhaka days starting today. */
export function nextDays(now: Date, count: number): string[] {
  const today = dhakaDay(now);
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.parse(`${today}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10),
  );
}

/** "09:30" ↔ 570 */
export const toMinutes = (hhmm: string) => {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
};
export const toHhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
