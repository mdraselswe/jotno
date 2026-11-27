import { describe, expect, it } from "vitest";
import { DISTRICTS } from "./geo";
import { districtBySlug, districtSlug } from "./places";

describe("district slugs", () => {
  it("are lowercase words joined by dashes", () => {
    expect(districtSlug({ en: "Cox's Bazar" })).toBe("coxs-bazar");
    expect(districtSlug({ en: "Dhaka" })).toBe("dhaka");
  });

  it("are unique and lead back to their district", () => {
    const slugs = DISTRICTS.map(districtSlug);
    expect(new Set(slugs).size).toBe(DISTRICTS.length);
    for (const d of DISTRICTS) expect(districtBySlug(districtSlug(d))?.id).toBe(d.id);
    expect(districtBySlug("nowhere")).toBeUndefined();
  });
});
