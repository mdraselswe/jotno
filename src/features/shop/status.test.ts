import { describe, expect, it } from "vitest";
import { couponDiscount } from "./cart";
import { customerCanCancel, orderActions, orderStep } from "./status";

describe("orderActions", () => {
  it("walks an order from placed to delivered", () => {
    expect(orderActions("placed")).toEqual(["process", "cancel"]);
    expect(orderActions("processing")).toEqual(["ship", "cancel"]);
    expect(orderActions("shipped")).toEqual(["deliver", "return"]);
    expect(orderActions("cancelled")).toEqual([]);
  });
  it("lets customers cancel only before packing", () => {
    expect(customerCanCancel("paid")).toBe(true);
    expect(customerCanCancel("processing")).toBe(false);
  });
  it("maps statuses to progress steps", () => {
    expect(orderStep("placed")).toBe(0);
    expect(orderStep("delivered")).toBe(3);
    expect(orderStep("returned")).toBe(-1);
  });
});

describe("couponDiscount", () => {
  const percent = { kind: "percent" as const, value: 1_000, minSubtotal: 50_000, maxDiscount: 20_000 };
  it("takes a percentage, rounded down to taka", () => {
    expect(couponDiscount(123_450, percent)).toBe(12_300);
  });
  it("respects the cap and the minimum", () => {
    expect(couponDiscount(500_000, percent)).toBe(20_000);
    expect(couponDiscount(40_000, percent)).toBe(0);
  });
  it("never gives more than the subtotal", () => {
    expect(couponDiscount(10_000, { kind: "flat", value: 50_000, minSubtotal: 0, maxDiscount: null })).toBe(
      10_000,
    );
  });
});
