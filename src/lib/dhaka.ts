/**
 * Dhaka calendar helpers (UTC+6, no daylight saving), so day maths needs no
 * time-zone library. Days are "YYYY-MM-DD" strings.
 */
export const DHAKA_OFFSET_MIN = 6 * 60;

/** "2026-12-01" (a Dhaka calendar day) → its weekday, 0 = Sunday. */
export function dhakaWeekday(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

/** The Dhaka calendar day of an instant: "YYYY-MM-DD". */
export function dhakaDay(instant: Date): string {
  return new Date(instant.getTime() + DHAKA_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

/** UTC instant of a Dhaka day + minute. */
export function dhakaInstant(day: string, minute: number): Date {
  return new Date(Date.parse(`${day}T00:00:00Z`) + (minute - DHAKA_OFFSET_MIN) * 60_000);
}

/** Minutes since Dhaka midnight of an instant. */
export function dhakaMinute(instant: Date): number {
  const shifted = new Date(instant.getTime() + DHAKA_OFFSET_MIN * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}
