import { describe, expect, it } from "vitest";
import { clampQty, deliveryFee, normalizeCart, stockProblems, subtotal } from "./cart";

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
});
