import { describe, expect, it } from "vitest";
import { ipFromHeaders } from "./client-ip";

const h = (init: Record<string, string>) => new Headers(init);

describe("ipFromHeaders", () => {
  it("uses the proxy-set headers", () => {
    expect(ipFromHeaders(h({ "cf-connecting-ip": "203.0.113.1", "x-forwarded-for": "9.9.9.9" }))).toBe(
      "203.0.113.1",
    );
    expect(ipFromHeaders(h({ "x-real-ip": "203.0.113.2", "x-forwarded-for": "9.9.9.9, 203.0.113.2" }))).toBe(
      "203.0.113.2",
    );
  });

  it("never trusts the first x-forwarded-for entry", () => {
    expect(ipFromHeaders(h({ "x-forwarded-for": "9.9.9.9, 203.0.113.3" }))).toBe("203.0.113.3");
    expect(ipFromHeaders(h({}))).toBe("local");
  });
});
