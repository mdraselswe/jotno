import { describe, expect, it } from "vitest";
import { extFor, ownsUpload } from "./kinds";

const me = "6f1c3a52-1111-4222-8333-944455556666";

describe("ownsUpload", () => {
  it("accepts the viewer's own path", () => {
    expect(ownsUpload(`pet/${me}/abc-123.webp`, "pet", me)).toBe(true);
  });
  it("rejects another kind, user or a traversal", () => {
    expect(ownsUpload(`avatar/${me}/a.webp`, "pet", me)).toBe(false);
    expect(ownsUpload(`pet/someone-else/a.webp`, "pet", me)).toBe(false);
    expect(ownsUpload(`pet/${me}/../x.webp`, "pet", me)).toBe(false);
    expect(ownsUpload(null, "pet", me)).toBe(false);
    // The dot before the extension is literal, not "any character".
    expect(ownsUpload(`pet/${me}/abcxwebp`, "pet", me)).toBe(false);
  });
});

describe("extFor", () => {
  it("maps known types only", () => {
    expect(extFor("image/webp")).toBe("webp");
    expect(extFor("text/html")).toBeNull();
  });
});
