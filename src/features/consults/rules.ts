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
