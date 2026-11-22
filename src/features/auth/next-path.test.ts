import { describe, expect, it } from "vitest";
import { safeNext } from "./next-path";

describe("safeNext", () => {
  const fallback = "/account";

  it("keeps our own paths and adds the locale when missing", () => {
    expect(safeNext("/admin/", fallback, "bn")).toBe("/admin/");
    expect(safeNext("/en/admin/", fallback, "bn")).toBe("/en/admin/");
    expect(safeNext("/admin/", fallback, "en")).toBe("/en/admin/");
  });

  it("falls back for anything that could leave the site", () => {
    for (const bad of [
      null,
      "",
      "admin",
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "/x?u=https://evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "/ /evil.com",
    ]) {
      expect(safeNext(bad, fallback, "bn"), String(bad)).toBe(fallback);
    }
  });
});
