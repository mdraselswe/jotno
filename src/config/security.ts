/**
 * HTTP security headers for every response. Server mode sends them from
 * next.config.ts; static mode writes them into the host config (`pnpm mode`):
 * public/_headers (Cloudflare, Netlify) or vercel.json.
 *
 * Not included: Content-Security-Policy. A strict CSP needs per-request nonces
 * (server mode only) and a list of every third-party origin the project uses,
 * so each project adds its own (see docs/security.md).
 */
export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/**
 * Sent only by our own server (server mode). The host's CDN (Hostinger's
 * hcdn) offers HTTP/3, and Chrome on some networks here gets stuck on it:
 * JavaScript chunks hang for ~45 s and then fail with ERR_QUIC_PROTOCOL_ERROR,
 * so links stop responding and navigations end on the error page. Over
 * HTTP/2 the same files arrive in well under a second. `clear` tells the
 * browser to forget the HTTP/3 offer and stay on HTTP/2.
 */
export const SERVER_HEADERS: { key: string; value: string }[] = [{ key: "Alt-Svc", value: "clear" }];
