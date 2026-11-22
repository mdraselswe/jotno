/**
 * Money rules as plain functions (no database), so they are unit-tested.
 * Amounts are integer poisha. A ledger never stores a balance: balances are
 * sums of rows.
 *
 *   paid consult  → charge(+fee) · commission(+commission) · vet_payable(+fee−commission, available after the consult)
 *   refund        → refund(+fee) · vet_payable(−(fee−commission)) · commission(−commission)
 *   payout        → payout(−amount) for the vet
 */
export type LedgerKind = "charge" | "commission" | "vet_payable" | "refund" | "payout";

export interface LedgerRow {
  kind: LedgerKind;
  amount: number;
  providerId: string | null;
  paymentId: string | null;
  refId: string | null;
  availableAt: Date | null;
  memo: string;
}

/** Commission in poisha for a fee, rounded to the nearest poisha (half up). */
export function commissionFor(fee: number, rateBps: number): number {
  assertPoisha(fee);
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10_000)
    throw new Error("rateBps must be 0–10000");
  return Math.floor((fee * rateBps + 5_000) / 10_000);
}

export function paidRows(input: {
  fee: number;
  commission: number;
  providerId: string;
  paymentId: string;
  refId: string;
  /** When the vet may withdraw it (end of the consult or appointment). */
  availableAt: Date;
  memo: string;
}): LedgerRow[] {
  assertPoisha(input.fee);
  assertPoisha(input.commission);
  if (input.commission > input.fee) throw new Error("commission is more than the fee");
  const base = { paymentId: input.paymentId, refId: input.refId, memo: input.memo };
  return [
    { ...base, kind: "charge", amount: input.fee, providerId: input.providerId, availableAt: null },
    {
      ...base,
      kind: "commission",
      amount: input.commission,
      providerId: input.providerId,
      availableAt: null,
    },
    {
      ...base,
      kind: "vet_payable",
      amount: input.fee - input.commission,
      providerId: input.providerId,
      availableAt: input.availableAt,
    },
  ];
}

/** Reverses a paid consult/appointment in full. */
export function refundRows(input: {
  fee: number;
  commission: number;
  providerId: string;
  paymentId: string;
  refId: string;
  memo: string;
}): LedgerRow[] {
  const base = { paymentId: input.paymentId, refId: input.refId, memo: input.memo, availableAt: null };
  return [
    { ...base, kind: "refund", amount: input.fee, providerId: input.providerId },
    { ...base, kind: "commission", amount: -input.commission, providerId: input.providerId },
    { ...base, kind: "vet_payable", amount: -(input.fee - input.commission), providerId: input.providerId },
  ];
}

/** A platform-only charge (featured listing, shop order): all of it is Jotno's income. */
export function platformRows(input: {
  amount: number;
  paymentId: string;
  refId: string;
  memo: string;
}): LedgerRow[] {
  assertPoisha(input.amount);
  return [
    {
      kind: "charge",
      amount: input.amount,
      providerId: null,
      paymentId: input.paymentId,
      refId: input.refId,
      availableAt: null,
      memo: input.memo,
    },
    {
      kind: "commission",
      amount: input.amount,
      providerId: null,
      paymentId: input.paymentId,
      refId: input.refId,
      availableAt: null,
      memo: input.memo,
    },
  ];
}

/** Reverses a platform-only charge (cancelled paid order, booking fee given back). */
export function platformRefundRows(input: {
  amount: number;
  paymentId: string;
  refId: string;
  memo: string;
}): LedgerRow[] {
  assertPoisha(input.amount);
  const base = {
    providerId: null,
    paymentId: input.paymentId,
    refId: input.refId,
    availableAt: null,
    memo: input.memo,
  };
  return [
    { ...base, kind: "refund", amount: input.amount },
    { ...base, kind: "commission", amount: -input.amount },
  ];
}

export interface VetBalance {
  /** Can be paid out now. */
  available: number;
  /** Earned but the consult is not over yet. */
  pending: number;
  /** Total paid out so far (positive number). */
  paidOut: number;
  /** All-time earnings after commission and refunds. */
  earned: number;
}

export function vetBalance(
  rows: Pick<LedgerRow, "kind" | "amount" | "availableAt">[],
  now: Date,
): VetBalance {
  let available = 0;
  let pending = 0;
  let paidOut = 0;
  let earned = 0;
  for (const row of rows) {
    if (row.kind === "vet_payable") {
      earned += row.amount;
      if (row.amount < 0 || !row.availableAt || row.availableAt <= now) available += row.amount;
      else pending += row.amount;
    } else if (row.kind === "payout") {
      paidOut += -row.amount;
      available += row.amount;
    }
  }
  // A refund after release can briefly make "available" negative; it comes out of pending first.
  if (available < 0 && pending > 0) {
    const move = Math.min(pending, -available);
    pending -= move;
    available += move;
  }
  return { available, pending, paidOut, earned };
}

/** Whether a payout of `amount` is allowed. */
export function canPayout(balance: VetBalance, amount: number, minimum: number): boolean {
  return Number.isInteger(amount) && amount >= minimum && amount <= balance.available;
}

function assertPoisha(value: number) {
  if (!Number.isInteger(value) || value < 0)
    throw new Error(`Amount must be whole, non-negative poisha: ${value}`);
}
