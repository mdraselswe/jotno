/**
 * Pet health schedule (vaccine, deworming, check-up) as plain functions.
 * Days are Dhaka calendar days ("YYYY-MM-DD").
 */
export type HealthKind = "vaccine" | "deworm" | "checkup";

/** Default gap until the next one, when the owner doesn't set a due date. */
export const DEFAULT_INTERVAL_DAYS: Record<HealthKind, number> = {
  vaccine: 365,
  deworm: 90,
  checkup: 180,
};

const DAY = 86_400_000;

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

export function defaultDue(kind: HealthKind, givenOn: string): string {
  return addDays(givenOn, DEFAULT_INTERVAL_DAYS[kind]);
}

export type DueState = "ok" | "soon" | "due" | "none";

/** "soon" within 14 days, "due" on or after the day. */
export function dueState(dueOn: string | null, today: string, soonDays = 14): DueState {
  if (!dueOn) return "none";
  const left = daysBetween(today, dueOn);
  if (left <= 0) return "due";
  if (left <= soonDays) return "soon";
  return "ok";
}

/**
 * Health ring progress 0–1 for one kind: how much of the interval has been
 * kept (1 = just done, 0 = due or never done).
 */
export function ringProgress(
  kind: HealthKind,
  lastGiven: string | null,
  dueOn: string | null,
  today: string,
): number {
  if (!lastGiven) return 0;
  const due = dueOn ?? defaultDue(kind, lastGiven);
  const total = Math.max(1, daysBetween(lastGiven, due));
  const left = daysBetween(today, due);
  return Math.min(1, Math.max(0, left / total));
}

/** Reminder days before due: a week before, the day before, on the day. */
export function shouldRemind(dueOn: string, today: string, remindedOn: string | null): boolean {
  const left = daysBetween(today, dueOn);
  if (![7, 1, 0].includes(left)) return false;
  return remindedOn !== today;
}
