import { describe, expect, it } from "vitest";
import { normalizeRef, readCookie, withRef } from "./ref";

describe("normalizeRef", () => {
  it("upper-cases and accepts letters and digits", () => {
    expect(normalizeRef(" rasel12 ")).toBe("RASEL12");
  });
  it("rejects short, long and odd codes", () => {
    expect(normalizeRef("AB1")).toBeNull();
    expect(normalizeRef("A".repeat(13))).toBeNull();
    expect(normalizeRef("AB-123")).toBeNull();
    expect(normalizeRef(null)).toBeNull();
  });
});

describe("withRef", () => {
  it("adds the code and keeps other parameters", () => {
    expect(withRef("https://jotnocare.com/vets/?species=dog", "abcd12")).toBe(
      "https://jotnocare.com/vets/?species=dog&ref=ABCD12",
    );
  });
  it("replaces an older code", () => {
    expect(withRef("https://jotnocare.com/?ref=OLD123", "NEW123")).toBe("https://jotnocare.com/?ref=NEW123");
  });
  it("leaves the URL alone without a valid code", () => {
    expect(withRef("https://jotnocare.com/", null)).toBe("https://jotnocare.com/");
    expect(withRef("https://jotnocare.com/", "x")).toBe("https://jotnocare.com/");
    expect(withRef("not a url", "ABCD12")).toBe("not a url");
  });
});

describe("readCookie", () => {
  it("finds one cookie among many", () => {
    expect(readCookie("a=1; jotno_my_ref=ABCD12; b=2", "jotno_my_ref")).toBe("ABCD12");
    expect(readCookie("a=1", "jotno_my_ref")).toBeNull();
  });
});
