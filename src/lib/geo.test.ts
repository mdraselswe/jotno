import { describe, expect, it } from "vitest";
import { DEFAULT_RADIUS_KM, parseNear, parseRadius, widerRadius } from "./geo";

describe("near me", () => {
  it("accepts only known radii", () => {
    expect(parseRadius("5")).toBe(5);
    expect(parseRadius("7")).toBe(DEFAULT_RADIUS_KM);
    expect(parseRadius(null)).toBe(DEFAULT_RADIUS_KM);
  });
  it("suggests the next radius up", () => {
    expect(widerRadius(10)).toBe(25);
    expect(widerRadius(50)).toBeNull();
  });
  it("reads a point in Bangladesh and rejects junk", () => {
    expect(parseNear("23.7808,90.4067")).toEqual({ lat: 23.7808, lon: 90.4067 });
    expect(parseNear("51.5,-0.12")).toBeNull();
    expect(parseNear("abc,90")).toBeNull();
    expect(parseNear("23.7")).toBeNull();
  });
});
