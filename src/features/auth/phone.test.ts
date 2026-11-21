import { describe, expect, it } from "vitest";
import { safeNext } from "./next-path";
import { isBdMobile, normalizePhone } from "./phone";

describe("phone", () => {
  it("normalizes Bangladeshi numbers", () => {
    expect(normalizePhone("+880 1712-345678")).toBe("01712345678");
    expect(normalizePhone("০১৭১২৩৪৫৬৭৮")).toBe("01712345678");
    expect(normalizePhone("1712345678")).toBe("01712345678");
    expect(isBdMobile("01712345678")).toBe(true);
    expect(isBdMobile("01212345678")).toBe(false);
    expect(isBdMobile("0171234567")).toBe(false);
  });
});

describe("safeNext", () => {
  it("keeps our own paths and rejects others", () => {
    expect(safeNext("/account/pets/", "/x", "bn")).toBe("/account/pets/");
    expect(safeNext("/en/account/", "/x", "bn")).toBe("/en/account/");
    expect(safeNext("/account", "/x", "en")).toBe("/en/account");
    expect(safeNext("//evil.com", "/x", "bn")).toBe("/x");
    expect(safeNext("https://evil.com", "/x", "bn")).toBe("/x");
    expect(safeNext(null, "/x", "bn")).toBe("/x");
  });
});
