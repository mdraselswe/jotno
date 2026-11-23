import { describe, expect, it } from "vitest";
import {
  matchScore,
  parseShopFilters,
  runCatalog,
  searchWords,
  shopQuery,
  toggle,
  type CatalogItem,
  type ShopCategoryRef,
} from "./catalog";

const CATS: ShopCategoryRef[] = [
  { slug: "food", en: "Food", bn: "খাবার" },
  { slug: "grooming", en: "Grooming & litter", bn: "গ্রুমিং ও লিটার" },
  { slug: "accessories", en: "Beds & leashes", bn: "বেড ও লিশ" },
  { slug: "toys", en: "Toys", bn: "খেলনা" },
];

const item = (over: Partial<CatalogItem> & { nameEn: string }): CatalogItem => ({
  nameBn: over.nameEn,
  descriptionEn: null,
  descriptionBn: null,
  sku: null,
  unit: null,
  category: "food",
  speciesId: null,
  price: 50_000,
  compareAt: null,
  stock: 5,
  sold: 0,
  createdAt: new Date("2026-01-01"),
  ...over,
});

const ITEMS = [
  item({
    nameEn: "Kitten dry food",
    nameBn: "বিড়ালছানার শুকনো খাবার",
    speciesId: 1,
    price: 65_000,
    compareAt: 72_000,
    sold: 9,
  }),
  item({
    nameEn: "Adult dog food",
    nameBn: "কুকুরের খাবার",
    speciesId: 2,
    price: 145_000,
    compareAt: 160_000,
    sold: 3,
  }),
  item({ nameEn: "Bird seed mix", speciesId: 3, price: 26_000, sold: 12 }),
  item({ nameEn: "Clumping litter", category: "grooming", speciesId: 1, price: 55_000, stock: 0, sold: 20 }),
  item({ nameEn: "Steel bowl", category: "accessories", price: 42_000, createdAt: new Date("2026-06-01") }),
  item({
    nameEn: "Feather wand",
    category: "toys",
    speciesId: 1,
    price: 18_000,
    descriptionEn: "Cats love chasing it",
  }),
];

const f = (sp: Record<string, string> = {}) => parseShopFilters(sp, CATS);

describe("parseShopFilters", () => {
  it("drops unknown values and keeps a known order", () => {
    const x = f({ category: "toys,nope,food", pet: "cat,lion", sort: "weird" });
    expect(x.categories).toEqual(["food", "toys"]);
    expect(x.pets).toEqual(["cat"]);
    expect(x.sort).toBe("popular");
  });
  it("swaps a reversed price range and ignores junk", () => {
    expect(f({ min: "900", max: "100" })).toMatchObject({ min: 100, max: 900 });
    expect(f({ min: "-5", max: "abc" })).toMatchObject({ min: null, max: null });
  });
  it("sorts by relevance by default only while searching", () => {
    expect(f({ q: "food" }).sort).toBe("relevance");
    expect(f({ sort: "relevance" }).sort).toBe("popular");
  });
  it("round-trips through the query string, leaving defaults out", () => {
    const x = toggle(f({ q: "food", pet: "dog", stock: "1", page: "3" }), "categories", "food");
    const back = parseShopFilters(Object.fromEntries(new URLSearchParams(shopQuery(x))), CATS);
    expect(back).toEqual(x);
    expect(shopQuery(f())).toBe("");
    expect(x.page).toBe(1);
  });
});

describe("search", () => {
  it("splits and normalises words", () => {
    expect(searchWords("  Dog,  FOOD dog ")).toEqual(["dog", "food"]);
  });
  it("needs every word to match", () => {
    expect(matchScore(ITEMS[1] as CatalogItem, searchWords("dog food"), CATS)).toBeGreaterThan(0);
    expect(matchScore(ITEMS[1] as CatalogItem, searchWords("dog litter"), CATS)).toBe(0);
  });
  it("matches pets and categories by their everyday words, in both languages", () => {
    const names = (q: string) => runCatalog(ITEMS, f({ q }), "en", CATS).items.map((i) => i.nameEn);
    expect(names("cat")).toEqual(expect.arrayContaining(["Kitten dry food", "Feather wand"]));
    expect(names("বিড়ালের খাবার")).toEqual(["Kitten dry food"]);
    expect(names("puppy")).toEqual(["Adult dog food"]);
    expect(names("shampoo")).toEqual([]); // a specific word only matches product text
    expect(names("litter")).toEqual(["Clumping litter"]);
  });
  it("ranks name matches above description matches", () => {
    const items = runCatalog(ITEMS, f({ q: "food" }), "en", CATS).items.map((i) => i.nameEn);
    expect(items.slice(0, 2)).toEqual(expect.arrayContaining(["Kitten dry food", "Adult dog food"]));
  });
});

describe("runCatalog", () => {
  it("filters by pet, counting pet-neutral products for every pet", () => {
    const r = runCatalog(ITEMS, f({ pet: "dog" }), "en", CATS);
    expect(r.items.map((i) => i.nameEn).sort()).toEqual(["Adult dog food", "Steel bowl"]);
  });
  it("counts each facet without its own filter", () => {
    const r = runCatalog(ITEMS, f({ category: "food" }), "en", CATS);
    expect(r.total).toBe(3);
    expect(r.facets.categories).toMatchObject({ food: 3, grooming: 1, toys: 1, accessories: 1 });
    expect(r.facets.pets).toMatchObject({ cat: 1, dog: 1, bird: 1 });
    expect(r.facets.onSale).toBe(2);
  });
  it("filters by price in taka", () => {
    const r = runCatalog(ITEMS, f({ min: "400", max: "600" }), "en", CATS);
    expect(r.items.map((i) => i.price).every((p) => p >= 40_000 && p <= 60_000)).toBe(true);
    expect(r.facets.price).toEqual({ min: 18_000, max: 145_000 });
  });
  it("sorts, always putting out-of-stock last", () => {
    const asc = runCatalog(ITEMS, f({ sort: "price_asc" }), "en", CATS).items.map((i) => i.price);
    expect(asc).toEqual([18_000, 26_000, 42_000, 65_000, 145_000, 55_000]);
    const pop = runCatalog(ITEMS, f(), "en", CATS).items.map((i) => i.nameEn);
    expect(pop[0]).toBe("Bird seed mix");
    expect(pop.at(-1)).toBe("Clumping litter");
    const sale = runCatalog(ITEMS, f({ sort: "discount" }), "en", CATS).items.map((i) => i.nameEn);
    expect(sale[0]).toBe("Kitten dry food");
    const az = runCatalog(ITEMS, f({ sort: "name" }), "en", CATS).items.map((i) => i.nameEn);
    expect(az.slice(0, 2)).toEqual(["Adult dog food", "Bird seed mix"]);
  });
  it("hides out-of-stock and keeps only discounts when asked", () => {
    expect(runCatalog(ITEMS, f({ stock: "1" }), "en", CATS).total).toBe(5);
    expect(runCatalog(ITEMS, f({ sale: "1" }), "en", CATS).total).toBe(2);
  });
  it("clamps the page", () => {
    expect(runCatalog(ITEMS, f({ page: "9" }), "en", CATS).page).toBe(1);
  });
});
