import { describe, expect, it } from "vitest";
import { DEFAULT_VET_SORT, parseVetSort } from "./vet-sort";

describe("parseVetSort", () => {
  it("keeps a known sort and falls back to recommended", () => {
    expect(parseVetSort("fee")).toBe("fee");
    expect(parseVetSort("rating")).toBe("rating");
    expect(parseVetSort("experience")).toBe("experience");
    expect(parseVetSort("cheapest")).toBe(DEFAULT_VET_SORT);
    expect(parseVetSort(null)).toBe("recommended");
    expect(parseVetSort(undefined)).toBe("recommended");
  });
});
