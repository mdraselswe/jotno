import { site } from "@/config";
import { LOCALES, localePath } from "@/config/locale";
import { articlePath, pageUrl, productPath, questionPath, vetPath } from "@/config/routes";
import { publishedArticleSlugs } from "@/features/articles/server";
import { verifiedVetSlugs } from "@/features/providers/server";
import { answeredQuestionIds } from "@/features/questions/server";
import { activeProductSlugs } from "@/features/shop/server";

/**
 * Database pages (vets, answered questions, guides, products) in every
 * language. The static pages are in /sitemap.xml (scripts/generate-assets.ts);
 * robots.txt lists both.
 */
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET() {
  const [vets, questions, articles, products] = await Promise.all([
    verifiedVetSlugs(),
    answeredQuestionIds(),
    publishedArticleSlugs(),
    activeProductSlugs(),
  ]);
  const routes: { route: string; lastmod?: Date }[] = [
    ...vets.map((v) => ({ route: vetPath(v.slug), lastmod: v.updatedAt })),
    ...questions.map((q) => ({ route: questionPath(q.id), lastmod: q.createdAt })),
    ...articles.map((a) => ({ route: articlePath(a.slug), lastmod: a.updatedAt })),
    ...products.map((p) => ({ route: productPath(p.slug) })),
  ];
  const base = site.url.replace(/\/$/, "");
  const urls = routes.flatMap(({ route, lastmod }) =>
    LOCALES.map((locale) => {
      const alternates = LOCALES.map(
        (l) =>
          `<xhtml:link rel="alternate" hreflang="${l}" href="${escape(base + pageUrl(localePath(l, route)))}"/>`,
      ).join("");
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
