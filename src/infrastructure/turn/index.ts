import "server-only";
import { serverEnv } from "@/config/env";

/**
 * ICE servers for a WebRTC call. With a Cloudflare Realtime TURN key we ask for
 * short-lived TURN credentials (the key itself never reaches the browser);
 * without one, STUN only, which connects most Wi-Fi calls but not every call on
 * mobile data. https://developers.cloudflare.com/realtime/turn/generate-credentials/
 */
export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

const STUN_ONLY: IceServer[] = [{ urls: ["stun:stun.cloudflare.com:3478"] }];

function isIceServer(x: unknown): x is IceServer {
  if (typeof x !== "object" || x === null) return false;
  const urls = (x as IceServer).urls;
  return typeof urls === "string" || (Array.isArray(urls) && urls.every((u) => typeof u === "string"));
}

/** Port 53 TURN URLs time out in browsers; drop them. */
const usable = (urls: string | string[]) =>
  (Array.isArray(urls) ? urls : [urls]).filter((u) => !/:53(\?|$)/.test(u));

export async function iceServers(ttlSeconds = 4 * 3600): Promise<{ servers: IceServer[]; relay: boolean }> {
  const { CLOUDFLARE_TURN_KEY_ID: keyId, CLOUDFLARE_TURN_API_TOKEN: token } = serverEnv();
  if (!keyId || !token) return { servers: STUN_ONLY, relay: false };
  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ttl: ttlSeconds }),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) throw new Error(`TURN credentials: HTTP ${res.status}`);
    const json: unknown = await res.json();
    const list = (json as { iceServers?: unknown }).iceServers;
    const servers = (Array.isArray(list) ? list : [list])
      .filter(isIceServer)
      .map((s) => ({ ...s, urls: usable(s.urls) }))
      .filter((s) => s.urls.length > 0);
    if (servers.length === 0) throw new Error("TURN credentials: empty response");
    return { servers, relay: true };
  } catch (error) {
    console.error("[turn] falling back to STUN only", error);
    return { servers: STUN_ONLY, relay: false };
  }
}
