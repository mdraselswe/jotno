/**
 * Sends every public URL to IndexNow (Bing, Yandex, Seznam, Naver) in one go:
 * the static pages plus the live /sitemap-content.xml (vets, districts,
 * answers, guides, products). New pages are announced on their own as they
 * go live (src/infrastructure/indexnow); run this after a launch or a big
 * change: `pnpm indexnow`. Needs the site deployed with its key file.
 *
 * Run with Node's built-in TypeScript support: `node scripts/indexnow.ts`.
 */
import { site } from "../src/config/index.ts";
import { LOCALES, localePath } from "../src/config/locale.ts";
import { pageUrl, SITEMAP_ROUTES } from "../src/config/routes.ts";

const key = site.seo.indexNowKey;
if (!key) {
  console.error("indexnow: no site.seo.indexNowKey in src/config/site.ts");
  process.exit(1);
}
const base = site.url.replace(/\/$/, "");

const keyFile = await fetch(`${base}/${key}.txt`);
if (!keyFile.ok || (await keyFile.text()).trim() !== key) {
  console.error(`indexnow: ${base}/${key}.txt is not live yet. Deploy first.`);
  process.exit(1);
}

const urls = new Set(SITEMAP_ROUTES.flatMap((r) => LOCALES.map((l) => base + pageUrl(localePath(l, r)))));
const content = await fetch(`${base}/sitemap-content.xml`).then((r) => (r.ok ? r.text() : ""));
for (const [, loc] of content.matchAll(/<loc>([^<]+)<\/loc>/g)) if (loc) urls.add(loc.replace(/&amp;/g, "&"));

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(base).host,
    key,
    keyLocation: `${base}/${key}.txt`,
    urlList: [...urls].slice(0, 10_000),
  }),
});
console.log(
  `indexnow: sent ${urls.size} URLs → HTTP ${res.status} ${res.status < 300 ? "(accepted)" : await res.text()}`,
);
if (res.status >= 300) process.exit(1);
