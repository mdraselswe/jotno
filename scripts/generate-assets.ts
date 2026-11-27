/**
 * Generates config-driven public files before `dev` and `build`:
 * robots.txt, sitemap.xml, manifest.webmanifest, app icons and a basic
 * service worker. They are build output (git-ignored); edit src/config instead.
 *
 * Why not Next metadata routes (app/robots.ts…)? In static mode they need
 * `dynamic = "force-static"`, which server mode (Cache Components) rejects.
 * Files in public/ work the same in both modes.
 *
 * Run with Node's built-in TypeScript support: `node scripts/generate-assets.ts`.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { MARK_VIEWBOX, markSvg } from "../src/config/brand-mark.ts";
import { business, features, site } from "../src/config/index.ts";
import { DEFAULT_LOCALE, LOCALES, localeDir, localePath, privatePathVariants } from "../src/config/locale.ts";
import { pageUrl, ROUTES, SITEMAP_ROUTES, speciesPath } from "../src/config/routes.ts";
import { SECURITY_HEADERS } from "../src/config/security.ts";
import { emergencyContent } from "../src/content/emergency.ts";
import { faqContent } from "../src/content/faq.ts";
import { shopFaq } from "../src/content/shop-faq.ts";
import { SPECIES_PAGE_SLUGS, speciesPages } from "../src/content/species-pages.ts";
import { clientMessagesModule, loadCatalogue, scanClientKeys } from "./lib/client-keys.ts";
import { toHexColor } from "./lib/color.ts";

const PUBLIC = path.resolve("public");
const ICONS = path.join(PUBLIC, "icons");
mkdirSync(ICONS, { recursive: true });

const write = (file: string, content: string | Buffer) => writeFileSync(path.join(PUBLIC, file), content);
const abs = (route: string) => new URL(pageUrl(route), `${site.url}/`).toString();

// robots.txt: private and dev paths disallowed in every language.
const DEV_PATHS = ["/dev"];
const disallow = privatePathVariants([...site.privatePaths, ...DEV_PATHS]).map((p) => `Disallow: ${p}`);
/**
 * Search engines and AI assistants named on purpose: public pages are open to
 * every one of them (search, AI answers and training), so Jotno can be found
 * and recommended. They share the `*` rules (a named group replaces `*` for
 * that bot, so it must repeat them: RFC 9309 lets one group list many agents).
 */
const CRAWLERS = [
  "*",
  "Googlebot",
  "Google-Extended",
  "Bingbot",
  "Applebot",
  "Applebot-Extended",
  "DuckDuckBot",
  "DuckAssistBot",
  "YandexBot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Meta-ExternalAgent",
  "Amazonbot",
  "MistralAI-User",
  "cohere-ai",
  "DeepSeekBot",
  "Bytespider",
  "CCBot",
];
write(
  "robots.txt",
  [
    ...CRAWLERS.map((ua) => `User-agent: ${ua}`),
    "Allow: /",
    ...disallow,
    "",
    `Sitemap: ${site.url}/sitemap.xml`,
    // Vets, questions, guides and products (a route handler, server mode only).
    ...(site.render === "server" ? [`Sitemap: ${site.url}/sitemap-content.xml`] : []),
    "",
  ].join("\n"),
);

// sitemap.xml: every page in every language, with hreflang alternates.
const alternates = (route: string) =>
  LOCALES.length > 1
    ? [
        ...LOCALES.map(
          (l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${abs(localePath(l, route))}"/>`,
        ),
        `<xhtml:link rel="alternate" hreflang="x-default" href="${abs(localePath(DEFAULT_LOCALE, route))}"/>`,
      ]
    : [];
const urls = SITEMAP_ROUTES.flatMap((r) =>
  LOCALES.map((l) =>
    [
      "  <url>",
      `    <loc>${abs(localePath(l, r))}</loc>`,
      ...alternates(r).map((a) => `    ${a}`),
      "    <changefreq>weekly</changefreq>",
      `    <priority>${r === ROUTES.home ? "1.0" : "0.7"}</priority>`,
      "  </url>",
    ].join("\n"),
  ),
);
write(
  "sitemap.xml",
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n"),
);

// llms.txt (https://llmstxt.org): a plain summary of the site for AI assistants,
// built from the same config and content as the pages, so facts never drift.
const money = (locale: string, poisha: number) =>
  `৳${new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-BD").format(poisha / 100)}`;
const num = (locale: string, n: number) =>
  new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-BD").format(n);
const fill = (text: string, locale: string) => {
  const vars: Record<string, string> = {
    chat: money(locale, business.consult.minFee),
    reply: num(locale, business.consult.replyWindowMinutes),
    quick: money(locale, business.quick.fee),
    booking: money(locale, business.appointment.bookingFee),
    keep: num(locale, 100 - business.consult.commissionBps / 100),
    inside: money(locale, business.shop.deliveryInside),
    outside: money(locale, business.shop.deliveryOutside),
    free: money(locale, business.shop.freeDeliveryFrom),
    inMin: num(locale, business.shop.deliveryDays.inside.min),
    inMax: num(locale, business.shop.deliveryDays.inside.max),
    outMin: num(locale, business.shop.deliveryDays.outside.min),
    outMax: num(locale, business.shop.deliveryDays.outside.max),
    returns: num(locale, business.shop.returnDays),
  };
  return text.replace(/\{(\w+)\}/g, (all, k: string) => vars[k] ?? all);
};
const faqLines = (locale: string) =>
  (faqContent[locale]?.items ?? [])
    .filter((item) => item.when !== "quick" || business.quick.enabled)
    .flatMap((item) => [`### ${item.q}`, "", fill(item.a, locale), ""]);
const shopLines = (locale: string) =>
  (shopFaq[locale]?.items ?? []).flatMap((item) => [`### ${item.q}`, "", fill(item.a, locale), ""]);
const link = (locale: string, route: string, label: string, note: string) =>
  `- [${label}](${abs(localePath(locale, route))}): ${note}`;
const en = LOCALES.includes("en") ? "en" : DEFAULT_LOCALE;
const llms = [
  `# ${site.name} (যত্ন)`,
  "",
  `> ${site.name} is a Bangla-first veterinary platform for Bangladesh: BVC-verified vets near you, online chat with a vet from ${money(en, business.consult.minFee)}, clinic visit booking, a free vet-answered pet Q&A, vet-written care guides and vaccine reminders.`,
  "",
  `${site.name} (${site.url}) serves pet owners and farmers anywhere in Bangladesh (online chat) and in every district (clinic search), in Bangla (default) and English. Every vet is checked against the Bangladesh Veterinary Council (BVC) register with their certificate and national ID before their profile goes live. Chats are paid with bKash or Nagad; if the vet does not reply within ${business.consult.replyWindowMinutes} minutes the owner gets the full fee back. Vets join free and keep ${100 - business.consult.commissionBps / 100}% of each chat fee.`,
  "",
  "## Useful for",
  "",
  "- Finding a verified vet (পশু ডাক্তার) or vet clinic in Dhaka, Chattogram or any district of Bangladesh",
  "- Talking to a vet online from home, in Bangla, about a cat, dog, bird, rabbit, cow, goat or chickens",
  "- Free answers from vets to pet health questions",
  "- First aid in a pet emergency, and vets who take emergencies 24/7",
  "- Buying cat food, dog food, cat litter and pet supplies online in Bangladesh with cash on delivery",
  "- Farm animal health: cows (lumpy skin, foot-and-mouth), goats (PPR) and poultry (Newcastle/Ranikhet, Gumboro)",
  "",
  "## Main pages",
  "",
  link(
    en,
    ROUTES.vets,
    "Find a vet",
    "search verified vets by district, area, animal or location; see fees, clinic hours and ratings",
  ),
  link(en, ROUTES.questions, "Ask a vet, free", "public questions answered by verified vets"),
  link(en, ROUTES.articles, "Pet care guides", "articles written by verified vets"),
  link(
    en,
    ROUTES.emergency,
    "Pet emergency first aid",
    "what to do for poisoning, bleeding, choking, heatstroke, accidents and seizures",
  ),
  ...(business.quick.enabled
    ? [
        link(
          en,
          ROUTES.quick,
          "Quick help",
          `a short question for ${money(en, business.quick.fee)}, answered within ${business.quick.answerMinutes} minutes`,
        ),
      ]
    : []),
  link(
    en,
    ROUTES.shop,
    "Pet shop",
    "cat and dog food, cat litter, toys and supplies, cash on delivery across Bangladesh",
  ),
  link(en, ROUTES.forVets, "For vets", "how vets join, earn and get verified"),
  link(en, ROUTES.about, "About Jotno", "who we are and how vets are verified"),
  "",
  "## Vets by animal",
  "",
  ...SPECIES_PAGE_SLUGS.map((slug) => {
    const page = speciesPages[en]?.[slug];
    return page ? link(en, speciesPath(slug), page.title.split(":")[0] ?? slug, page.description) : "";
  }).filter(Boolean),
  "",
  "## Bangla pages (বাংলা)",
  "",
  ...(LOCALES.includes("bn")
    ? [
        link("bn", ROUTES.home, "যত্ন", "বাংলাদেশের যাচাইকৃত পশু ডাক্তার ও অনলাইন ভেট চ্যাট"),
        link("bn", ROUTES.vets, "ভেট খুঁজুন", "জেলা, এলাকা বা প্রাণী দিয়ে যাচাইকৃত ভেট"),
        link("bn", ROUTES.questions, "বিনামূল্যে ভেটকে জিজ্ঞেস করুন", "ভেটদের দেওয়া উত্তর"),
        link("bn", ROUTES.emergency, "জরুরি প্রাথমিক চিকিৎসা", "পোষা প্রাণীর জরুরি অবস্থায় করণীয়"),
        link("bn", ROUTES.shop, "পেট শপ", "ক্যাট ফুড, ডগ ফুড, ক্যাট লিটার, ক্যাশ অন ডেলিভারি"),
        ...SPECIES_PAGE_SLUGS.map((slug) => {
          const page = speciesPages.bn?.[slug];
          return page
            ? link("bn", speciesPath(slug), page.title.split(":")[0] ?? slug, page.description)
            : "";
        }).filter(Boolean),
      ]
    : []),
  "",
  "## Emergency first aid topics",
  "",
  ...(emergencyContent[en]?.cards ?? []).map((c) => `- ${c.title}`),
  "",
  "## Frequently asked questions",
  "",
  ...faqLines(en),
  ...(LOCALES.includes("bn") ? ["## সাধারণ প্রশ্ন ও উত্তর", "", ...faqLines("bn")] : []),
  `## ${shopFaq[en]?.title ?? "Pet shop questions"}`,
  "",
  ...shopLines(en),
  ...(LOCALES.includes("bn")
    ? [`## ${shopFaq.bn?.title ?? "পেট শপ নিয়ে প্রশ্ন"}`, "", ...shopLines("bn")]
    : []),
  "## Optional",
  "",
  `- [Sitemap](${site.url}/sitemap.xml): every page in every language`,
  ...(site.render === "server"
    ? [`- [Vets, answers and guides](${site.url}/sitemap-content.xml): database pages`]
    : []),
  link(en, ROUTES.terms, "Terms", "terms of service"),
  link(en, ROUTES.privacy, "Privacy", "privacy policy"),
  "",
  `Contact: ${site.contact.email ?? site.url}`,
  "",
].join("\n");
write("llms.txt", llms);

// IndexNow key file (src/infrastructure/indexnow): proves the pings come from this site.
if (site.seo.indexNowKey) write(`${site.seo.indexNowKey}.txt`, site.seo.indexNowKey);

// Security headers for static hosts that read public/_headers (Cloudflare, Netlify). Server mode sends them itself.
const NO_CACHE = "  Cache-Control: public, max-age=0, must-revalidate";
write(
  "_headers",
  [
    "/*",
    ...SECURITY_HEADERS.map((h) => `  ${h.key}: ${h.value}`),
    "/sw.js",
    NO_CACHE,
    "/manifest.webmanifest",
    NO_CACHE,
    "",
  ].join("\n"),
);

// App icon: a rounded tile in the brand colour with the Jotno mark (src/config/brand-mark.ts).
const mode = site.theme.defaultMode === "dark" ? "dark" : "light";
const brand = toHexColor(site.theme.primary.light);
const onBrand = toHexColor(site.theme.primaryForeground.light);
const bg = toHexColor(site.theme.background[mode]);

function iconSvg({ size, radius, scale }: { size: number; radius: number; scale: number }) {
  const r = size * radius;
  const inner = size * 0.74 * scale;
  const offset = (size - inner) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${r}" fill="${brand}"/><svg x="${offset}" y="${offset}" width="${inner}" height="${inner}" viewBox="${MARK_VIEWBOX}">${markSvg(onBrand, brand)}</svg></svg>`;
}

write("icons/icon.svg", iconSvg({ size: 64, radius: 0.22, scale: 1 }));
const png = (svg: string) => sharp(Buffer.from(svg)).png().toBuffer();
const [icon192, icon512, maskable, apple] = await Promise.all([
  png(iconSvg({ size: 192, radius: 0.22, scale: 1 })),
  png(iconSvg({ size: 512, radius: 0.22, scale: 1 })),
  // Maskable: full-bleed square, mark inside the 80% safe zone.
  png(iconSvg({ size: 512, radius: 0, scale: 0.8 })),
  // Apple adds its own rounded corners.
  png(iconSvg({ size: 180, radius: 0, scale: 1 })),
]);
write("icons/icon-192.png", icon192);
write("icons/icon-512.png", icon512);
write("icons/icon-maskable-512.png", maskable);
write("icons/apple-touch-icon.png", apple);

// Web manifest + a service worker that caches pages as they are visited.
// (Static builds replace out/sw.js with one that precaches the whole site.)
if (features.pwa) {
  const manifest = {
    id: "/",
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    lang: DEFAULT_LOCALE,
    dir: localeDir(DEFAULT_LOCALE),
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: bg,
    theme_color: bg,
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  write("manifest.webmanifest", `${JSON.stringify(manifest, null, 2)}\n`);
  const template = readFileSync(path.resolve("scripts/sw.template.js"), "utf8");
  write(
    "sw.js",
    template
      .replace("__VERSION__", `runtime-${Date.now()}`)
      .replace("__PRECACHE__", JSON.stringify(["/"]))
      .replace("__PRIVATE__", JSON.stringify(privatePathVariants())),
  );
} else {
  rmSync(path.join(PUBLIC, "manifest.webmanifest"), { force: true });
  rmSync(path.join(PUBLIC, "sw.js"), { force: true });
}

// The UI text the browser may need, per language (src/i18n/client-messages.ts,
// committed; a test checks it's current). Written only when it changed.
const clientMessagesFile = path.resolve("src/i18n/client-messages.ts");
const clientMessages = clientMessagesModule(
  await loadCatalogue(process.cwd()),
  scanClientKeys(process.cwd()),
);
let currentMessages = "";
try {
  currentMessages = readFileSync(clientMessagesFile, "utf8");
} catch {
  // Not there yet: written below.
}
if (currentMessages !== clientMessages) writeFileSync(clientMessagesFile, clientMessages);

process.stdout.write(
  `generate-assets: robots, sitemap, llms.txt, _headers, icons${features.pwa ? ", manifest, sw" : ""}, client text (${site.render} mode)\n`,
);
