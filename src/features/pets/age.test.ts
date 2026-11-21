import { describe, expect, it } from "vitest";
import { petAge } from "./age";

describe("petAge", () => {
  it("counts whole years", () => {
    expect(petAge("2023-05-10", "2026-11-22")).toEqual({ unit: "years", n: 3 });
  });
  it("uses months under a year", () => {
    expect(petAge("2026-06-25", "2026-11-22")).toEqual({ unit: "months", n: 4 });
  });
  it("handles missing or future birthdays", () => {
    expect(petAge(null, "2026-11-22")).toBeNull();
    expect(petAge("2027-01-01", "2026-11-22")).toBeNull();
  });
});
