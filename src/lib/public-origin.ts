/** Addresses a server binds to, never what the browser typed. */
const BIND_ALL = new Set(["0.0.0.0", "[::]", "::"]);

/**
 * The origin the browser sees (https://jotnocare.com), for redirects from
 * route handlers. Behind a proxy (Hostinger) `request.nextUrl.origin` is the
 * app's own bind address (http://0.0.0.0:3000), which the browser can't open.
 * Order: the proxy's forwarded host, the Host header, the site URL, the URL.
 */
export function publicOrigin(headers: Headers, url: URL, siteUrl?: string): string {
  const first = (v: string | null) => v?.split(",")[0]?.trim() || null;
  const forwarded = first(headers.get("x-forwarded-host"));
  const proto = first(headers.get("x-forwarded-proto"));
  if (forwarded) return `${proto ?? "https"}://${forwarded}`;
  const host = first(headers.get("host"));
  if (host && !BIND_ALL.has(host.replace(/:\d+$/, "")))
    return `${proto ?? url.protocol.replace(/:$/, "")}://${host}`;
  if (BIND_ALL.has(url.hostname) && siteUrl) return siteUrl.replace(/\/$/, "");
  return url.origin;
}
