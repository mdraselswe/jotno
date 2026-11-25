import { describe, expect, it } from "vitest";
import { maxPointsFor, pointsBalance, type PointRow } from "./points";

const day = (n: number) => new Date(Date.UTC(2026, 0, 1) + n * 86_400_000);
const earn = (amount: number, at: number, expiresIn = 180, status: PointRow["status"] = "available") => ({
  amount,
  status,
  createdAt: day(at),
  expiresAt: day(at + expiresIn),
});
const spend = (amount: number, at: number): PointRow => ({
  amount: -amount,
  status: "available",
  createdAt: day(at),
  expiresAt: null,
});

describe("pointsBalance", () => {
  it("adds earnings and takes away spending", () => {
    expect(pointsBalance([earn(20, 0), earn(5, 1), spend(10, 2)], day(3))).toEqual({
      available: 15,
      pending: 0,
      expiringSoon: 0,
    });
  });

  it("keeps pending points apart", () => {
    expect(pointsBalance([earn(5, 0, 180, "pending"), earn(20, 0)], day(1)).pending).toBe(5);
  });

  it("drops expired points", () => {
    expect(pointsBalance([earn(20, 0, 10)], day(11)).available).toBe(0);
  });

  it("spends the points that expire first", () => {
    // 10 expiring on day 10, 10 expiring on day 100; spending 10 on day 5 uses the first lot.
    const rows = [earn(10, 0, 10), earn(10, 0, 100), spend(10, 5)];
    expect(pointsBalance(rows, day(20)).available).toBe(10);
  });

  it("ignores void rows and points earned after a spend", () => {
    const rows = [earn(10, 0, 180, "void"), spend(5, 1), earn(10, 2)];
    expect(pointsBalance(rows, day(3)).available).toBe(10);
  });

  it("counts points expiring within 30 days", () => {
    expect(pointsBalance([earn(10, 0, 40), earn(5, 0, 300)], day(20)).expiringSoon).toBe(10);
  });
});

describe("maxPointsFor", () => {
  it("caps a shop order at its share of the subtotal", () => {
    // 5% of ৳1,000 = ৳50
    expect(maxPointsFor(100_000, 500, 300)).toBe(50);
  });
  it("caps a chat at half of Jotno's commission", () => {
    // half of ৳29 = ৳14 (whole taka, rounded down)
    expect(maxPointsFor(2_900, 5_000, 300)).toBe(14);
  });
  it("never gives more than the balance or less than zero", () => {
    expect(maxPointsFor(100_000, 500, 7)).toBe(7);
    expect(maxPointsFor(-5, 500, 7)).toBe(0);
  });
});
