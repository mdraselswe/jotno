import { describe, expect, it } from "vitest";
import {
  clampQty,
  couponDiscount,
  deliveryFee,
  maxAddable,
  normalizeCart,
  percentOff,
  stockProblems,
  subtotal,
} from "./cart";

const rule = { inside: 6_000, outside: 12_000, freeFrom: 200_000, homeDistrictId: 47 };

describe("cart", () => {
  it("adds up lines and charges delivery by district", () => {
    const lines = [
      { productId: "a", qty: 2, price: 45_000, stock: 5 },
      { productId: "b", qty: 1, price: 30_000, stock: 1 },
    ];
    const sub = subtotal(lines);
    expect(sub).toBe(120_000);
    expect(deliveryFee(sub, 47, rule)).toBe(6_000);
    expect(deliveryFee(sub, 1, rule)).toBe(12_000);
    expect(deliveryFee(250_000, 1, rule)).toBe(0);
    expect(deliveryFee(0, 1, rule)).toBe(0);
  });

  it("finds stock problems", () => {
    expect(
      stockProblems([
        { productId: "a", qty: 3, price: 1, stock: 2 },
        { productId: "b", qty: 1, price: 1, stock: 0 },
        { productId: "c", qty: 1, price: 1, stock: 9 },
      ]),
    ).toEqual(["a", "b"]);
  });

  it("normalizes and clamps quantities", () => {
    expect(
      normalizeCart([
        { productId: "a", qty: 1 },
        { productId: "a", qty: 2.7 },
        { productId: "b", qty: 0 },
      ]),
    ).toEqual([{ productId: "a", qty: 3 }]);
    expect(clampQty(50, 100)).toBe(20);
    expect(clampQty(5, 3)).toBe(3);
    expect(clampQty(Number.NaN, 3)).toBe(1);
  });

  it("limits how many more can be added", () => {
    expect(maxAddable(5, 0)).toBe(5);
    expect(maxAddable(5, 3)).toBe(2);
    expect(maxAddable(5, 7)).toBe(0);
    expect(maxAddable(0, 0)).toBe(0);
    expect(maxAddable(100, 0)).toBe(20);
    expect(maxAddable(-3, 0)).toBe(0);
  });

  it("works out the percent off", () => {
    expect(percentOff(80_00, 100_00)).toBe(20);
    expect(percentOff(100_00, 100_00)).toBe(0);
    expect(percentOff(100_00, null)).toBe(0);
    expect(percentOff(120_00, 100_00)).toBe(0);
  });

  it("drops a coupon below its minimum (the cart must not send it)", () => {
    const c = { kind: "flat" as const, value: 10_000, minSubtotal: 50_000, maxDiscount: null };
    expect(couponDiscount(60_000, c)).toBe(10_000);
    expect(couponDiscount(40_000, c)).toBe(0);
  });
});
