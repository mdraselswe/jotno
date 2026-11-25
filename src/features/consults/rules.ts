/**
 * Consult (paid chat) rules as plain functions. Times are UTC Dates.
 *
 * Life of a consult:
 *   pending_payment ──paid──▶ active ──24h or vet closes──▶ closed
 *          │                    └──vet silent 30 min──▶ refunded (full, automatic)
 *          └──payment fails / owner cancels──▶ cancelled
 */
export type ConsultStatus = "pending_payment" | "active" | "closed" | "refunded" | "cancelled";

export interface ConsultTimes {
  status: ConsultStatus;
  openedAt: Date | null;
  firstReplyAt: Date | null;
  closesAt: Date | null;
}

export interface ConsultPolicy {
  /** How long a paid chat stays open. */
  openHours: number;
  /** If the vet doesn't answer within this, the owner gets a full refund. */
  replyWindowMinutes: number;
}

const MINUTE = 60_000;

export function closesAt(openedAt: Date, policy: ConsultPolicy): Date {
  return new Date(openedAt.getTime() + policy.openHours * 60 * MINUTE);
}

/** Active, the vet never replied, and the reply window has passed. */
export function needsAutoRefund(c: ConsultTimes, now: Date, policy: ConsultPolicy): boolean {
  return (
    c.status === "active" &&
    c.firstReplyAt === null &&
    c.openedAt !== null &&
    now.getTime() - c.openedAt.getTime() >= policy.replyWindowMinutes * MINUTE
  );
}

/** Active and its time is over (and it is not a refund case). */
export function needsClose(c: ConsultTimes, now: Date, policy: ConsultPolicy): boolean {
  return (
    c.status === "active" && c.closesAt !== null && c.closesAt <= now && !needsAutoRefund(c, now, policy)
  );
}

export function canSend(c: Pick<ConsultTimes, "status">): boolean {
  return c.status === "active";
}

/** Minutes left for the vet to reply before the automatic refund (null when not relevant). */
export function replyMinutesLeft(c: ConsultTimes, now: Date, policy: ConsultPolicy): number | null {
  if (c.status !== "active" || c.firstReplyAt || !c.openedAt) return null;
  const left = policy.replyWindowMinutes - (now.getTime() - c.openedAt.getTime()) / MINUTE;
  return Math.max(0, Math.ceil(left));
}

export type ConsultRole = "owner" | "vet" | null;

export function roleIn(
  consult: { ownerId: string; providerProfileId: string },
  userId: string | null | undefined,
): ConsultRole {
  if (!userId) return null;
  if (consult.ownerId === userId) return "owner";
  if (consult.providerProfileId === userId) return "vet";
  return null;
}

/**
 * Which reminder a chat still waiting for the vet's first reply is due:
 * 0 none yet, 1 after a third of the reply window, 2 after two thirds.
 */
export function nudgeStep(openedAt: Date, now: Date, replyWindowMinutes: number): 0 | 1 | 2 {
  const waited = (now.getTime() - openedAt.getTime()) / MINUTE;
  if (waited >= replyWindowMinutes) return 0;
  if (waited >= (replyWindowMinutes * 2) / 3) return 2;
  if (waited >= replyWindowMinutes / 3) return 1;
  return 0;
}
