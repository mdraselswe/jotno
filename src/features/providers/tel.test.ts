import { describe, expect, it } from "vitest";
import { telHref } from "./tel";

describe("telHref", () => {
  it("links a real number", () => {
    expect(telHref("01712-345 678")).toBe("tel:01712345678");
    expect(telHref("+880 1712 345678")).toBe("tel:+8801712345678");
    expect(telHref("০১৭১২৩৪৫৬৭৮")).toBe("tel:01712345678");
    expect(telHref("16263")).toBe("tel:16263");
  });

  it("gives nothing to call for a missing or blank number", () => {
    expect(telHref(undefined)).toBeNull();
    expect(telHref(null)).toBeNull();
    expect(telHref("")).toBeNull();
    expect(telHref("   ")).toBeNull();
    expect(telHref("n/a")).toBeNull();
  });
});
