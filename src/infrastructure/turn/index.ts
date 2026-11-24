import "server-only";
import { serverEnv } from "@/config/env";
import { toIceServers, type IceServer } from "./ice";

export type { IceServer } from "./ice";

/**
 * ICE servers for a WebRTC call. TURN relays calls that can't connect directly
 * (common on mobile data behind carrier NAT). Providers, first one configured wins:
 * - Cloudflare Realtime TURN: short-lived credentials per call; the key never
 *   reaches the browser. https://developers.cloudflare.com/realtime/turn/generate-credentials/
 * - Metered: the ICE servers of one Metered TURN credential, fetched with its API
 *   key and cached for a few minutes. https://www.metered.ca/docs/turn-rest-api/get-credential
 * Neither: STUN only, which connects most Wi-Fi calls but not every call on mobile data.
 */
const STUN_ONLY: IceServer[] = [{ urls: ["stun:stun.cloudflare.com:3478"] }];

const METERED_CACHE_MS = 10 * 60 * 1000;
let meteredCache: { servers: IceServer[]; until: number } | null = null;

async function cloudflare(keyId: string, token: string, ttlSeconds: number): Promise<IceServer[]> {
  const res = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: ttlSeconds }),
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!res.ok) throw new Error(`Cloudflare TURN: HTTP ${res.status}`);
  return toIceServers(await res.json());
}

async function metered(domain: string, apiKey: string): Promise<IceServer[]> {
  if (meteredCache && meteredCache.until > Date.now()) return meteredCache.servers;
  const url = new URL("/api/v1/turn/credentials", `https://${domain}`);
  url.searchParams.set("apiKey", apiKey);
  const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
  if (!res.ok) throw new Error(`Metered TURN: HTTP ${res.status}`);
  const servers = toIceServers(await res.json());
  meteredCache = { servers, until: Date.now() + METERED_CACHE_MS };
  return servers;
}

export async function iceServers(ttlSeconds = 4 * 3600): Promise<{ servers: IceServer[]; relay: boolean }> {
  const env = serverEnv();
  try {
    if (env.CLOUDFLARE_TURN_KEY_ID && env.CLOUDFLARE_TURN_API_TOKEN)
      return {
        servers: await cloudflare(env.CLOUDFLARE_TURN_KEY_ID, env.CLOUDFLARE_TURN_API_TOKEN, ttlSeconds),
        relay: true,
      };
    if (env.METERED_TURN_DOMAIN && env.METERED_TURN_API_KEY)
      return { servers: await metered(env.METERED_TURN_DOMAIN, env.METERED_TURN_API_KEY), relay: true };
  } catch (error) {
    console.error("[turn] falling back to STUN only", error);
  }
  return { servers: STUN_ONLY, relay: false };
}
