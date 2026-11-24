/**
 * The caller's IP, for rate limits. Only headers the host's proxy sets count:
 * - Cloudflare sets cf-connecting-ip (Hostinger's CDN strips one sent by a client).
 * - Hostinger's CDN sets x-real-ip, overwriting one sent by a client.
 * - Otherwise the last x-forwarded-for entry (added by the nearest proxy); the
 *   first entry is whatever the client sent, so it can't be trusted.
 */
export function ipFromHeaders(h: Pick<Headers, "get">): string {
  const direct = h.get("cf-connecting-ip") ?? h.get("x-real-ip");
  if (direct?.trim()) return direct.trim();
  const last = h.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return last || "local";
}
