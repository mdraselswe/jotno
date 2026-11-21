import { describe, expect, it } from "vitest";
import { formatter } from "@/i18n";
import { taka, toPoisha } from "./money";

describe("money", () => {
  it("formats whole taka without decimals", () => {
    expect(taka(formatter("en"), 30000)).toContain("300");
    expect(taka(formatter("en"), 30000)).not.toContain(".00");
  });
  it("parses taka input to poisha", () => {
    expect(toPoisha("300")).toBe(30000);
    expect(toPoisha("৳1,200.5")).toBe(120050);
    expect(toPoisha("abc")).toBeNull();
    expect(toPoisha(-1)).toBeNull();
  });
});
