/**
 * Jotno points as plain functions (no database), so they are unit-tested.
 * One point is ৳1. Rows are a ledger: earning is positive, spending negative.
 * Earned points expire; spending uses the points that expire first.
 */
export type PointStatus = "pending" | "available" | "void";

export interface PointRow {
  amount: number;
  status: PointStatus;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface PointsBalance {
  /** Can be spent now. */
  available: number;
  /** Earned, waiting for the invited person to do something. */
  pending: number;
  /** Of `available`, how many expire within 30 days. */
  expiringSoon: number;
}

const SOON_MS = 30 * 86_400_000;

export function pointsBalance(rows: readonly PointRow[], now: Date): PointsBalance {
  const lots = rows
    .filter((r) => r.amount > 0 && r.status === "available")
    .map((r) => ({ left: r.amount, createdAt: r.createdAt, expiresAt: r.expiresAt }))
    .sort((a, b) => expiry(a.expiresAt) - expiry(b.expiresAt));
  const spends = rows
    .filter((r) => r.amount < 0 && r.status !== "void")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (const spend of spends) {
    let need = -spend.amount;
    for (const lot of lots) {
      if (need === 0) break;
      const usable =
        lot.left > 0 && lot.createdAt <= spend.createdAt && expiry(lot.expiresAt) > spend.createdAt.getTime();
      if (!usable) continue;
      const take = Math.min(lot.left, need);
      lot.left -= take;
      need -= take;
    }
  }

  let available = 0;
  let expiringSoon = 0;
  for (const lot of lots) {
    if (lot.left <= 0 || expiry(lot.expiresAt) <= now.getTime()) continue;
    available += lot.left;
    if (expiry(lot.expiresAt) - now.getTime() <= SOON_MS) expiringSoon += lot.left;
  }
  const pending = rows
    .filter((r) => r.amount > 0 && r.status === "pending")
    .reduce((sum, r) => sum + r.amount, 0);
  return { available, pending, expiringSoon };
}

function expiry(date: Date | null): number {
  return date ? date.getTime() : Number.POSITIVE_INFINITY;
}

/**
 * The most points (whole taka) that may pay for something: a share of a shop
 * subtotal, or a share of Jotno's own commission on a chat. Never more than
 * the person has. Amounts are poisha.
 */
export function maxPointsFor(basePoisha: number, bps: number, balance: number): number {
  const cap = Math.floor((Math.max(0, basePoisha) * bps) / 10_000 / 100);
  return Math.max(0, Math.min(cap, balance));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}
