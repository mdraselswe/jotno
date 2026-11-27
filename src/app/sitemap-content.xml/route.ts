import { site } from "@/config";
import { LOCALES, localePath } from "@/config/locale";
import {
  articlePath,
  districtPath,
  pageUrl,
  productPath,
  questionPath,
  speciesPath,
  vetPath,
} from "@/config/routes";
import { DISTRICTS } from "@/content/geo";
import { districtSlug } from "@/content/places";
import { SPECIES_PAGE_SLUGS } from "@/content/species-pages";
import { publishedArticleSlugs } from "@/features/articles/server";
import { vetCountsByDistrict, vetCountsBySpecies, verifiedVetSlugs } from "@/features/providers/server";
import { answeredQuestionIds } from "@/features/questions/server";
import { activeProductSlugs } from "@/features/shop/server";

/**
 * Database pages (vets, answered questions, guides, products) in every
 * language. The static pages are in /sitemap.xml (scripts/generate-assets.ts);
 * robots.txt lists both.
 */
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET() {
  const [vets, districts, species, questions, articles, products] = await Promise.all([
    verifiedVetSlugs(),
    vetCountsByDistrict(),
    vetCountsBySpecies(),
    answeredQuestionIds(),
    publishedArticleSlugs(),
    activeProductSlugs(),
  ]);
  const routes: { route: string; lastmod?: Date }[] = [
    ...vets.map((v) => ({ route: vetPath(v.slug), lastmod: v.updatedAt })),
    // District pages with at least one real vet (the others are noindex).
    ...districts.flatMap((row) => {
      const d = DISTRICTS.find((x) => x.id === row.districtId);
      return d ? [{ route: districtPath(districtSlug(d)), lastmod: row.updatedAt }] : [];
    }),
    // Animal pages with at least one real vet.
    ...species
      .filter((row) => (SPECIES_PAGE_SLUGS as readonly string[]).includes(row.slug))
      .map((row) => ({ route: speciesPath(row.slug), lastmod: row.updatedAt })),
    ...questions.map((q) => ({ route: questionPath(q.id), lastmod: q.createdAt })),
    ...articles.map((a) => ({ route: articlePath(a.slug), lastmod: a.updatedAt })),
    ...products.map((p) => ({ route: productPath(p.slug) })),
  ];
  const base = site.url.replace(/\/$/, "");
  const urls = routes.flatMap(({ route, lastmod }) =>
    LOCALES.map((locale) => {
      const alternates = [...LOCALES, "x-default"]
        .map((l) => {
          const href = base + pageUrl(localePath(l === "x-default" ? site.i18n.defaultLocale : l, route));
          return `<xhtml:link rel="alternate" hreflang="${l}" href="${escape(href)}"/>`;
        })
        .join("");
      return `<url><loc>${escape(base + pageUrl(localePath(locale, route)))}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ""}${alternates}</url>`;
    }),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join("")}</urlset>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
