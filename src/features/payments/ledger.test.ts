import { describe, expect, it } from "vitest";
import {
  canPayout,
  commissionFor,
  paidRows,
  platformRefundRows,
  platformRows,
  refundRows,
  vetBalance,
} from "./ledger";

const now = new Date("2026-12-01T10:00:00Z");
const past = new Date("2026-11-30T10:00:00Z");
const future = new Date("2026-12-02T10:00:00Z");
const ids = { providerId: "p1", paymentId: "pay1", refId: "c1", memo: "consult" };

describe("commissionFor", () => {
  it("takes the rate in basis points and rounds half up", () => {
    expect(commissionFor(30_000, 1_500)).toBe(4_500);
    expect(commissionFor(33_333, 1_500)).toBe(5_000); // 4999.95 → 5000
    expect(commissionFor(10_001, 1_000)).toBe(1_000); // 1000.1 → 1000
    expect(commissionFor(50_000, 0)).toBe(0);
  });
  it("rejects fractions and bad rates", () => {
    expect(() => commissionFor(10.5, 1_000)).toThrow();
    expect(() => commissionFor(-1, 1_000)).toThrow();
    expect(() => commissionFor(100, 10_001)).toThrow();
  });
});

describe("paidRows / refundRows", () => {
  it("splits a fee into charge, commission and vet payable that add up", () => {
    const rows = paidRows({ ...ids, fee: 30_000, commission: 4_500, availableAt: future });
    expect(rows.map((r) => [r.kind, r.amount])).toEqual([
      ["charge", 30_000],
      ["commission", 4_500],
      ["vet_payable", 25_500],
    ]);
    const commission = rows.find((r) => r.kind === "commission")?.amount ?? 0;
    const payable = rows.find((r) => r.kind === "vet_payable")?.amount ?? 0;
    expect(commission + payable).toBe(30_000);
  });
  it("refund cancels the vet's payable and Jotno's commission", () => {
    const rows = [
      ...paidRows({ ...ids, fee: 30_000, commission: 4_500, availableAt: future }),
      ...refundRows({ ...ids, fee: 30_000, commission: 4_500 }),
    ];
    const sum = (kind: string) => rows.filter((r) => r.kind === kind).reduce((s, r) => s + r.amount, 0);
    expect(sum("vet_payable")).toBe(0);
    expect(sum("commission")).toBe(0);
    expect(sum("refund")).toBe(30_000);
  });
  it("rejects a commission above the fee", () => {
    expect(() => paidRows({ ...ids, fee: 100, commission: 200, availableAt: future })).toThrow();
  });
  it("platform charges are all commission", () => {
    const rows = platformRows({ amount: 100_000, paymentId: "x", refId: "f1", memo: "featured" });
    expect(rows.every((r) => r.providerId === null)).toBe(true);
    expect(rows.find((r) => r.kind === "commission")?.amount).toBe(100_000);
  });
});

describe("platformRefundRows", () => {
  it("cancels a platform charge out", () => {
    const paid = platformRows({ amount: 50_000, paymentId: "p", refId: "o", memo: "order" });
    const back = platformRefundRows({ amount: 50_000, paymentId: "p", refId: "o", memo: "refund" });
    const income = [...paid, ...back]
      .filter((r) => r.kind === "commission")
      .reduce((n, r) => n + r.amount, 0);
    expect(income).toBe(0);
    expect(back.find((r) => r.kind === "refund")?.amount).toBe(50_000);
  });
});

describe("vetBalance", () => {
  it("holds money until the consult is over, then makes it available", () => {
    const rows = [
      ...paidRows({ ...ids, fee: 30_000, commission: 4_500, availableAt: past }),
      ...paidRows({ ...ids, refId: "c2", fee: 50_000, commission: 7_500, availableAt: future }),
    ];
    expect(vetBalance(rows, now)).toEqual({ available: 25_500, pending: 42_500, paidOut: 0, earned: 68_000 });
  });
  it("payouts reduce what's available", () => {
    const rows = [
      ...paidRows({ ...ids, fee: 30_000, commission: 4_500, availableAt: past }),
      { kind: "payout" as const, amount: -20_000, availableAt: null },
    ];
    const balance = vetBalance(rows, now);
    expect(balance).toMatchObject({ available: 5_500, paidOut: 20_000 });
    expect(canPayout(balance, 5_500, 50_000)).toBe(false); // below the minimum
    expect(canPayout(balance, 6_000, 0)).toBe(false); // more than available
    expect(canPayout(balance, 5_500, 5_000)).toBe(true);
  });
  it("a refund of a pending consult removes it from pending", () => {
    const rows = [
      ...paidRows({ ...ids, fee: 30_000, commission: 4_500, availableAt: future }),
      ...refundRows({ ...ids, fee: 30_000, commission: 4_500 }),
    ];
    expect(vetBalance(rows, now)).toMatchObject({ available: 0, pending: 0, earned: 0 });
  });
});
