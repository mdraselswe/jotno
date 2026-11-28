import { describe, expect, it } from "vitest";
import { clientIssueLine, createRateLimit, parseClientIssue } from "./client-issue";

describe("parseClientIssue", () => {
  it("accepts a valid report", () => {
    expect(
      parseClientIssue({ kind: "asset-retry", path: "/_next/static/chunks/a.js", ms: 8012, proto: "h3" }),
    ).toEqual({ kind: "asset-retry", path: "/_next/static/chunks/a.js", ms: 8012, proto: "h3" });
  });

  it("rejects unknown kinds and bad numbers", () => {
    expect(parseClientIssue({ kind: "hack" })).toBeNull();
    expect(parseClientIssue({ kind: "slow-load", ms: -1 })).toBeNull();
    expect(parseClientIssue({ kind: "slow-load", ms: 1.5 })).toBeNull();
    expect(parseClientIssue(null)).toBeNull();
  });

  it("cuts long text and removes line breaks, so one report is one log line", () => {
    const r = parseClientIssue({ kind: "error-page", detail: `a\nb\r\nc${"x".repeat(500)}` });
    expect(r?.detail?.startsWith("a b c")).toBe(true);
    expect(r?.detail).toHaveLength(240);
  });
});

describe("clientIssueLine", () => {
  it("writes a searchable single line", () => {
    const line = clientIssueLine(
      { kind: "asset-failed", path: "/x.js", ms: 45000, detail: 'Failed "fetch"' },
      "Chrome",
    );
    expect(line).toBe(
      '[client-issue] asset-failed path=/x.js ms=45000 detail="Failed \\"fetch\\"" ua="Chrome"',
    );
  });
});

describe("createRateLimit", () => {
  it("allows the limit per window, then again in the next window", () => {
    let t = 0;
    const allow = createRateLimit(2, 1000, () => t);
    expect([allow("a"), allow("a"), allow("a"), allow("b")]).toEqual([true, true, false, true]);
    t = 1000;
    expect(allow("a")).toBe(true);
  });
});
