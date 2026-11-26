import { describe, expect, it } from "vitest";
import { bvcKey } from "./bvc";

describe("bvcKey", () => {
  it("keeps only the digits, without leading zeros", () => {
    expect(bvcKey("BVC-01234")).toBe("1234");
    expect(bvcKey(" 1234 ")).toBe("1234");
    expect(bvcKey("Reg. no 12/34")).toBe("1234");
  });

  it("reads Bangla digits", () => {
    expect(bvcKey("১২৩৪")).toBe("1234");
    expect(bvcKey("বিভিসি ০১২৩৪")).toBe("1234");
  });

  it("is null when there is nothing to compare", () => {
    expect(bvcKey(null)).toBeNull();
    expect(bvcKey("")).toBeNull();
    expect(bvcKey("BVC")).toBeNull();
    expect(bvcKey("000")).toBeNull();
  });
});
