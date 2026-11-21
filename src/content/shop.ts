/** Shop categories (product.category holds the slug). */
export const SHOP_CATEGORIES = [
  { slug: "food", en: "Food", bn: "খাবার" },
  { slug: "grooming", en: "Grooming & litter", bn: "গ্রুমিং ও লিটার" },
  { slug: "accessories", en: "Beds & leashes", bn: "বেড ও লিশ" },
  { slug: "toys", en: "Toys", bn: "খেলনা" },
  { slug: "dress", en: "Dresses", bn: "পোশাক" },
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number]["slug"];

export const categoryName = (slug: string, locale: string) => {
  const c = SHOP_CATEGORIES.find((x) => x.slug === slug);
  return c ? (locale === "bn" ? c.bn : c.en) : slug;
};
