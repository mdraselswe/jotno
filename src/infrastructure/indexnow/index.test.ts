import { describe, expect, it } from "vitest";
import { LOCALES } from "@/config/locale";
import { indexNowBody } from "./index";

describe("indexNowBody", () => {
  it("lists each route once per language, with the key file on the site's host", () => {
    const body = indexNowBody(["/vet/dr-a", "/vet/dr-a"], "abcdef123456", "https://example.com/");
    expect(body?.host).toBe("example.com");
    expect(body?.keyLocation).toBe("https://example.com/abcdef123456.txt");
    expect(body?.urlList).toHaveLength(LOCALES.length);
    expect(body?.urlList.every((u) => u.startsWith("https://example.com/") && u.endsWith("/vet/dr-a/"))).toBe(
      true,
    );
  });

  it("is off without a key or without routes", () => {
    expect(indexNowBody(["/"], "", "https://example.com")).toBeNull();
    expect(indexNowBody([], "abcdef123456", "https://example.com")).toBeNull();
  });
});
