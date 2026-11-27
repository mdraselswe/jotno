import { describe, expect, it } from "vitest";
import { isStaleDeployError } from "./stale-deploy";

describe("errors from an older build", () => {
  it("spots missing chunks and server actions", () => {
    const chunk = new Error("Loading chunk 4821 failed.");
    chunk.name = "ChunkLoadError";
    expect(isStaleDeployError(chunk)).toBe(true);
    expect(
      isStaleDeployError(new TypeError("Failed to fetch dynamically imported module: /_next/x.js")),
    ).toBe(true);
    expect(isStaleDeployError(new Error('Server Action "7f3a" was not found on the server.'))).toBe(true);
    expect(isStaleDeployError(new Error("Failed to load chunk /_next/static/chunks/a.js"))).toBe(true);
  });
  it("leaves real errors alone", () => {
    expect(isStaleDeployError(new Error("connect ECONNREFUSED"))).toBe(false);
    expect(isStaleDeployError(null)).toBe(false);
    expect(isStaleDeployError({ message: "ChunkLoadError" })).toBe(false);
  });
});
