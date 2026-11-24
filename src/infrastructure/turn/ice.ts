/** WebRTC ICE server, as browsers take it in RTCConfiguration.iceServers. */
export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

function isIceServer(x: unknown): x is IceServer {
  if (typeof x !== "object" || x === null) return false;
  const urls = (x as IceServer).urls;
  return typeof urls === "string" || (Array.isArray(urls) && urls.every((u) => typeof u === "string"));
}

/** Port 53 TURN URLs time out in browsers; drop them. */
const usable = (urls: string | string[]) =>
  (Array.isArray(urls) ? urls : [urls]).filter((u) => !/:53(\?|$)/.test(u));

/**
 * Normalises a provider's answer: Cloudflare sends `{ iceServers: … }`, Metered a
 * bare array. Throws when nothing usable is left.
 */
export function toIceServers(json: unknown): IceServer[] {
  const list =
    typeof json === "object" && json !== null && !Array.isArray(json)
      ? (json as { iceServers?: unknown }).iceServers
      : json;
  const servers = (Array.isArray(list) ? list : [list])
    .filter(isIceServer)
    .map((s) => ({ ...s, urls: usable(s.urls) }))
    .filter((s) => s.urls.length > 0);
  if (servers.length === 0) throw new Error("TURN credentials: empty response");
  return servers;
}
