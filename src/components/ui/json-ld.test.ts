import { describe, expect, it } from "vitest";
import { jsonLdString } from "./json-ld";

describe("jsonLdString", () => {
  const evil = "</script><script>alert(1)</script><!-- & \u2028";

  it("leaves no character that can end the script element", () => {
    const out = jsonLdString({ name: evil });
    expect(out).not.toMatch(/[<>&\u2028\u2029]/);
    expect(out).toContain("\\u003c/script\\u003e");
  });

  it("is still the same JSON", () => {
    expect(JSON.parse(jsonLdString({ name: evil, n: 1 }))).toEqual({ name: evil, n: 1 });
  });
});
