import { isProduction, site } from "@/config";
import { publicEnv } from "@/config/env";
import { LOCALES, localePath } from "@/config/locale";
import { pageUrl } from "@/config/routes";

/**
 * IndexNow: tells Bing (which ChatGPT search, Copilot and DuckDuckGo use),
 * Yandex, Seznam and Naver that a page is new or changed, so it is crawled in
 * minutes instead of weeks. The key file is /<key>.txt (scripts/generate-assets.ts).
 * https://www.indexnow.org/documentation
 */
const ENDPOINT = "https://api.indexnow.org/indexnow";

/** The request body for these routes, in every language. Null when IndexNow is off. */
export function indexNowBody(routes: readonly string[], key = site.seo.indexNowKey, origin = site.url) {
  if (!key || routes.length === 0) return null;
  const base = origin.replace(/\/$/, "");
  const urlList = [...new Set(routes.flatMap((r) => LOCALES.map((l) => base + pageUrl(localePath(l, r)))))];
  return {
    host: new URL(base).host,
    key,
    keyLocation: `${base}/${key}.txt`,
    urlList: urlList.slice(0, 10_000),
  };
}

/** Only the real public site announces pages (not dev, demo or preview deploys). */
function enabled(): boolean {
  if (!isProduction || publicEnv.NEXT_PUBLIC_DEMO) return false;
  const host = new URL(site.url).hostname;
  return !["localhost", "127.0.0.1"].includes(host) && !host.endsWith(".workers.dev");
}

/**
 * Announces new or changed public pages (`routes` from ROUTES or a path
 * helper). Never throws: a failed ping only means the page is found later.
 * Call it inside `after()` so the person never waits for it.
 */
export async function announcePages(routes: readonly string[]): Promise<void> {
  const body = indexNowBody(routes);
  if (!body || !enabled()) return;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok && res.status !== 202) console.warn(`IndexNow: ${res.status}`);
  } catch (error) {
    console.warn("IndexNow failed", error);
  }
}
