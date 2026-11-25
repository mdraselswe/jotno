import { describe, expect, it } from "vitest";
import { paramsFromQueryString, parseVetQuery, vetSearchOf, VETS_MAX_PAGES } from "./search-params";

describe("parseVetQuery", () => {
  it("reads filters, sort and page", () => {
    const q = parseVetQuery({ district: "1", area: "11", species: "cat", now: "1", sort: "fee", page: "3" });
    expect(q).toMatchObject({
      districtId: 1,
      areaId: 11,
      species: "cat",
      onlyAvailable: true,
      sort: "fee",
      page: 3,
      near: null,
    });
  });

  it("drops an area that is not in the district, or without a district", () => {
    expect(parseVetQuery({ district: "47", area: "11" }).areaId).toBeNull();
    expect(parseVetQuery({ area: "11" }).areaId).toBeNull();
  });

  it("near me wins over a district", () => {
    const q = parseVetQuery({ near: "23.75,90.39", district: "47", area: "1" });
    expect(q.near).toEqual({ lat: 23.75, lon: 90.39 });
    expect(q.districtId).toBeNull();
    expect(q.areaId).toBeNull();
  });

  it("defaults and clamps bad values", () => {
    const q = parseVetQuery({ page: "999", sort: "x", species: "DROP TABLE", district: "-1" });
    expect(q.page).toBe(VETS_MAX_PAGES);
    expect(q.sort).toBe("recommended");
    expect(q.species).toBeNull();
    expect(q.districtId).toBeNull();
    expect(parseVetQuery({ page: "0" }).page).toBe(1);
  });

  it("the search leaves the page out", () => {
    expect(vetSearchOf(parseVetQuery({ page: "2", q: " rahim " }))).not.toHaveProperty("page");
    expect(vetSearchOf(parseVetQuery({ q: " rahim " })).q).toBe("rahim");
  });
});

describe("paramsFromQueryString", () => {
  it("keeps the first non-empty value of each key", () => {
    expect(paramsFromQueryString("district=47&district=1&q=&sort=fee")).toEqual({
      district: "47",
      sort: "fee",
    });
  });
});
