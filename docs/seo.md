# SEO and AI visibility

How Jotno is made easy to find in search engines (Google, Bing) and to quote in AI assistants (ChatGPT, Gemini, Claude, Perplexity, Copilot, DeepSeek).

## What the code does

| Piece                        | Where                                                                         | Why                                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Title + description per page | `generateMetadata` in each page; home: `meta.title` / `meta.description`      | Bangla title on Bangla pages, English on English pages                                                                                                       |
| hreflang + `x-default`       | `pageAlternates()` in `src/lib/metadata.ts`, both sitemaps                    | Google shows the right language                                                                                                                              |
| robots meta                  | root layout                                                                   | `max-snippet:-1`, `max-image-preview:large`: full snippets in results and AI answers                                                                         |
| JSON-LD                      | `src/lib/structured-data.ts` + pages                                          | Organization, WebSite (site name), FAQPage (home), BreadcrumbList, VeterinaryCare, Article (vet author), QAPage, Product, ItemList                           |
| FAQ                          | `src/content/faq.ts` (prices filled from `business.ts`)                       | Shown on the home page and in llms.txt: the answers AI assistants quote                                                                                      |
| District pages               | `/vets/in/<district>/` (`districtPath`)                                       | "vet in Dhaka" searches. Indexed only while the district has a real verified vet                                                                             |
| Animal pages                 | `/vets/for/<animal>/` (`speciesPath`), text in `src/content/species-pages.ts` | "বিড়ালের ডাক্তার", "cattle vet" searches: intro, common problems, FAQ. Linked from the home page and footer. Indexed only while a real vet treats that animal |
| Shop FAQ                     | `src/content/shop-faq.ts` (fees and days from `business.shop`)                | Delivery, cash on delivery and returns answers on `/shop/` (FAQPage) and in llms.txt                                                                         |
| Sitemaps                     | `/sitemap.xml` (static, generate-assets), `/sitemap-content.xml` (DB)         | Vets, districts, answered questions, guides, products. Demo vets left out                                                                                    |
| robots.txt                   | `scripts/generate-assets.ts` (`CRAWLERS`)                                     | Every search and AI crawler allowed on public pages; private paths blocked                                                                                   |
| llms.txt                     | `scripts/generate-assets.ts`                                                  | Plain summary for AI assistants, built from config and content                                                                                               |
| IndexNow                     | `src/infrastructure/indexnow`, key in `site.seo.indexNowKey`                  | New vet, guide or answer → Bing (ChatGPT search, Copilot) within minutes                                                                                     |

## Rules

- A new public page: `pageMetadata()` (or `pageAlternates()`), a breadcrumb (`breadcrumbLd`), add it to `SITEMAP_ROUTES` or the content sitemap.
- Only mark up what is visible on the page. Never fake ratings or reviews.
- Thin pages (no answer, no vet, demo data) get `robots: { index: false }` and stay out of the sitemaps.
- Prices and time windows in copy come from `src/config/business.ts` placeholders, never typed by hand.
- The demo site (`NEXT_PUBLIC_DEMO`, demo.jotnocare.com) is never indexed: `isIndexable` in `src/config/index.ts` turns on noindex (layout metadata + `X-Robots-Tag`), a robots.txt that lets only Googlebot and Bingbot in (to read the noindex), and drops the sitemaps, llms.txt and IndexNow.
- `pnpm indexnow` sends every URL once (after a launch or a big change). Day to day, publishing announces itself.

## Owner checklist

The off-site work (Search Console, Bing Webmaster Tools, Google Business Profile, host bot settings, mentions) is in `reports/Jotno SEO ar AI - amar kajer list.md`.
