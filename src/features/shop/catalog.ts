import { SHOP_CATEGORIES } from "@/content/shop";
import { SPECIES } from "@/content/geo";

/**
 * The shop's catalogue logic: read filters from the address, search,
 * filter, count facets, sort and page. Pure, so it is unit-tested and the
 * page and the server share one definition. The catalogue is small (a few
 * hundred products), so the server loads the active products once and this
 * does the rest; move the filters into SQL if it grows past ~2,000.
 */

export const SHOP_SORTS = [
  "relevance",
  "popular",
  "new",
  "price_asc",
  "price_desc",
  "discount",
  "name",
] as const;
export type ShopSort = (typeof SHOP_SORTS)[number];
export const SHOP_PAGE_SIZE = 24;

const CATEGORY_SLUGS = SHOP_CATEGORIES.map((c) => c.slug) as readonly string[];
const PET_SLUGS = SPECIES.map((s) => s.slug) as readonly string[];

export interface ShopFilters {
  q: string;
  categories: string[];
  pets: string[];
  /** Price bounds in whole taka (the address shows taka, products store poisha). */
  min: number | null;
  max: number | null;
  inStock: boolean;
  onSale: boolean;
  sort: ShopSort;
  page: number;
}

/** What the catalogue needs from a product. */
export interface CatalogItem {
  nameEn: string;
  nameBn: string;
  descriptionEn: string | null;
  descriptionBn: string | null;
  sku: string | null;
  unit: string | null;
  category: string;
  speciesId: number | null;
  price: number;
  compareAt: number | null;
  stock: number;
  sold: number;
  createdAt: Date;
}

type Param = string | string[] | undefined;
const all = (v: Param) => (Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(","));
const first = (v: Param) => (Array.isArray(v) ? v[0] : v) ?? "";
const taka = (v: Param) => {
  const n = Number.parseInt(first(v), 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 10_000_000) : null;
};

export function defaultSort(q: string): ShopSort {
  return q ? "relevance" : "popular";
}

/** Filters from the query string; anything unknown is dropped. */
export function parseShopFilters(sp: Record<string, Param>): ShopFilters {
  const q = first(sp.q).replace(/\s+/g, " ").trim().slice(0, 60);
  const uniq = (xs: string[], allowed: readonly string[]) => allowed.filter((a) => xs.includes(a)); // allowed order, no duplicates
  let min = taka(sp.min);
  let max = taka(sp.max);
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  const rawSort = first(sp.sort);
  const sort = (SHOP_SORTS as readonly string[]).includes(rawSort) ? (rawSort as ShopSort) : defaultSort(q);
  const page = Math.max(1, Math.min(500, Number.parseInt(first(sp.page), 10) || 1));
  return {
    q,
    categories: uniq(all(sp.category), CATEGORY_SLUGS),
    pets: uniq(all(sp.pet), PET_SLUGS),
    min,
    max,
    inStock: first(sp.stock) === "1",
    onSale: first(sp.sale) === "1",
    sort: sort === "relevance" && !q ? "popular" : sort,
    page,
  };
}

/** The query string for some filters (defaults left out, so links stay short). */
export function shopQuery(f: ShopFilters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.categories.length) p.set("category", f.categories.join(","));
  if (f.pets.length) p.set("pet", f.pets.join(","));
  if (f.min !== null) p.set("min", String(f.min));
  if (f.max !== null) p.set("max", String(f.max));
  if (f.inStock) p.set("stock", "1");
  if (f.onSale) p.set("sale", "1");
  if (f.sort !== defaultSort(f.q)) p.set("sort", f.sort);
  if (f.page > 1) p.set("page", String(f.page));
  return p.toString();
}

/** Toggle one value in a list filter (and go back to page 1). */
export function toggle(f: ShopFilters, key: "categories" | "pets", value: string): ShopFilters {
  const list = f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value];
  return { ...f, [key]: list, page: 1 };
}

export const hasFilters = (f: ShopFilters) =>
  Boolean(
    f.q || f.categories.length || f.pets.length || f.min !== null || f.max !== null || f.inStock || f.onSale,
  );

// ─── Search ──────────────────────────────────────────────────────────────

/**
 * Generic words for a category or a pet, in both languages; a search word
 * matches if it starts with one. Specific words (shampoo, leash, ball) are
 * left to the product's own name and description, so "shampoo" finds
 * shampoo, not every grooming product.
 */
const CATEGORY_WORDS: Record<string, string[]> = {
  food: ["food", "feed", "খাবার", "খাদ্য"],
  grooming: ["groom", "গ্রুম"],
  accessories: ["accessor", "এক্সেসরি"],
  toys: ["toy", "খেলনা"],
  dress: ["dress", "cloth", "পোশাক", "জামা"],
};
const PET_WORDS: Record<string, string[]> = {
  cat: ["cat", "kitten", "kitty", "বিড়াল", "বিলাই", "মেকুর"],
  dog: ["dog", "puppy", "pup", "কুকুর", "কুত্তা"],
  bird: ["bird", "parrot", "budgie", "pigeon", "পাখি", "টিয়া", "কবুতর"],
  rabbit: ["rabbit", "bunny", "খরগোশ"],
  cow: ["cow", "cattle", "calf", "গরু", "বাছুর"],
  goat: ["goat", "ছাগল"],
  chicken: ["chicken", "hen", "poultry", "মুরগি", "হাঁস"],
};

/**
 * Lower-case, punctuation dropped. NFD then NFC unifies the two ways Bangla
 * can encode য়, ড়, ঢ় (they never recompose), so typed and stored text match.
 */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchWords(q: string): string[] {
  return [
    ...new Set(
      normalize(q)
        .split(" ")
        .filter((w) => w.length > 0),
    ),
  ].slice(0, 8);
}

const startsWithAny = (word: string, keys: string[] | undefined) =>
  Boolean(
    keys?.some((k) => word.startsWith(normalize(k)) || (word.length >= 3 && normalize(k).startsWith(word))),
  );

/**
 * How well a product matches the search (0 = not at all). Every word must
 * match somewhere: the name (best, especially at a word start), the
 * category or pet it is for, the description, the SKU or pack size.
 */
export function matchScore(item: CatalogItem, words: string[]): number {
  if (words.length === 0) return 1;
  const names = normalize(`${item.nameEn} ${item.nameBn}`);
  const nameWords = names.split(" ");
  const rest = normalize(
    `${item.descriptionEn ?? ""} ${item.descriptionBn ?? ""} ${item.sku ?? ""} ${item.unit ?? ""}`,
  );
  const pet = SPECIES.find((s) => s.id === item.speciesId);
  const cat = SHOP_CATEGORIES.find((c) => c.slug === item.category);
  const petWords = pet ? [...(PET_WORDS[pet.slug] ?? []), pet.en, pet.bn] : [];
  const catWords = cat ? [...(CATEGORY_WORDS[cat.slug] ?? []), cat.en, cat.bn] : [];
  let score = 0;
  for (const w of words) {
    let s = 0;
    if (nameWords.some((n) => n === w)) s = 6;
    else if (nameWords.some((n) => n.startsWith(w))) s = 5;
    else if (names.includes(w)) s = 3;
    else if (startsWithAny(w, catWords) || startsWithAny(w, petWords)) s = 2;
    else if (rest.includes(w)) s = 1;
    if (s === 0) return 0;
    score += s;
  }
  return score;
}

// ─── Filter, facets, sort, page ──────────────────────────────────────────

const petSlug = (id: number | null) => SPECIES.find((s) => s.id === id)?.slug ?? null;
const onSale = (i: CatalogItem) => i.compareAt !== null && i.compareAt > i.price;
const discount = (i: CatalogItem) => (onSale(i) && i.compareAt ? 1 - i.price / i.compareAt : 0);

type Skip = "categories" | "pets" | "price" | null;
function passes(i: CatalogItem, f: ShopFilters, skip: Skip): boolean {
  if (skip !== "categories" && f.categories.length && !f.categories.includes(i.category)) return false;
  if (skip !== "pets" && f.pets.length) {
    // A product for no pet in particular (a bowl, a bed) suits every pet.
    const slug = petSlug(i.speciesId);
    if (slug !== null && !f.pets.includes(slug)) return false;
  }
  if (skip !== "price") {
    if (f.min !== null && i.price < f.min * 100) return false;
    if (f.max !== null && i.price > f.max * 100) return false;
  }
  if (f.inStock && i.stock <= 0) return false;
  if (f.onSale && !onSale(i)) return false;
  return true;
}

export interface Facets {
  categories: Record<string, number>;
  pets: Record<string, number>;
  /** Price range (poisha) of the products the other filters leave. */
  price: { min: number; max: number } | null;
  inStock: number;
  onSale: number;
}

export interface CatalogResult<T> {
  items: T[];
  total: number;
  pages: number;
  page: number;
  facets: Facets;
}

const SORTERS: Record<ShopSort, (a: Scored, b: Scored) => number> = {
  relevance: (a, b) => b.score - a.score || b.item.sold - a.item.sold,
  popular: (a, b) => b.item.sold - a.item.sold,
  new: (a, b) => b.item.createdAt.getTime() - a.item.createdAt.getTime(),
  price_asc: (a, b) => a.item.price - b.item.price,
  price_desc: (a, b) => b.item.price - a.item.price,
  discount: (a, b) => discount(b.item) - discount(a.item),
  name: () => 0, // replaced per locale below
};
type Scored = { item: CatalogItem; score: number };

/** Search, filter, count facets, sort (in-stock first) and page. */
export function runCatalog<T extends CatalogItem>(
  items: T[],
  f: ShopFilters,
  locale: string,
): CatalogResult<T> {
  const words = searchWords(f.q);
  const found: { item: T; score: number }[] = [];
  for (const item of items) {
    const score = matchScore(item, words);
    if (score > 0) found.push({ item, score });
  }

  const facets: Facets = { categories: {}, pets: {}, price: null, inStock: 0, onSale: 0 };
  for (const { item } of found) {
    if (passes(item, f, "categories"))
      facets.categories[item.category] = (facets.categories[item.category] ?? 0) + 1;
    if (passes(item, f, "pets")) {
      const slug = petSlug(item.speciesId);
      if (slug) facets.pets[slug] = (facets.pets[slug] ?? 0) + 1;
    }
    if (passes(item, f, "price")) {
      facets.price = facets.price
        ? { min: Math.min(facets.price.min, item.price), max: Math.max(facets.price.max, item.price) }
        : { min: item.price, max: item.price };
    }
    if (passes(item, { ...f, inStock: false }, null) && item.stock > 0) facets.inStock += 1;
    if (passes(item, { ...f, onSale: false }, null) && onSale(item)) facets.onSale += 1;
  }

  const collator = new Intl.Collator(locale === "bn" ? "bn" : "en");
  const byName = (a: Scored, b: Scored) =>
    collator.compare(
      locale === "bn" ? a.item.nameBn : a.item.nameEn,
      locale === "bn" ? b.item.nameBn : b.item.nameEn,
    );
  const sorter = f.sort === "name" ? byName : SORTERS[f.sort];
  const kept = found
    .filter(({ item }) => passes(item, f, null))
    .sort(
      (a, b) =>
        Number(b.item.stock > 0) - Number(a.item.stock > 0) ||
        sorter(a, b) ||
        b.item.createdAt.getTime() - a.item.createdAt.getTime(),
    );

  const total = kept.length;
  const pages = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  const page = Math.min(f.page, pages);
  const start = (page - 1) * SHOP_PAGE_SIZE;
  return { items: kept.slice(start, start + SHOP_PAGE_SIZE).map((s) => s.item), total, pages, page, facets };
}
