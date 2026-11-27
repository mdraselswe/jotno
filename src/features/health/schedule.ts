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

/** Which reminder a day falls in: the week before (7–2 days left), the day before, the day itself. */
export type ReminderStage = "week" | "tomorrow" | "today";

export function reminderStage(daysLeft: number): ReminderStage | null {
  if (daysLeft === 0) return "today";
  if (daysLeft === 1) return "tomorrow";
  if (daysLeft >= 2 && daysLeft <= 7) return "week";
  return null;
}

/**
 * The reminder to send today, if any: one per stage. A stage that the daily
 * job missed (a failed run, a record added 5 days before it's due) still goes
 * out on the next run inside that stage, instead of being lost.
 */
export function reminderDue(dueOn: string, today: string, remindedOn: string | null): ReminderStage | null {
  const stage = reminderStage(daysBetween(today, dueOn));
  if (!stage || remindedOn === today) return null;
  const last = remindedOn ? reminderStage(daysBetween(remindedOn, dueOn)) : null;
  return last === stage ? null : stage;
}
