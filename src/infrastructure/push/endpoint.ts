/**
 * The server POSTs every notification to a subscription's endpoint, so only
 * the browser push services are allowed (Chrome/Edge/Opera, Firefox, Windows,
 * Safari). Anything else would let a signed-in user make the server call an
 * arbitrary host (SSRF).
 */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /(^|\.)notify\.windows\.com$/,
  /^web\.push\.apple\.com$/,
];

export function isPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.port && PUSH_HOSTS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}
