import "server-only";
import { serverEnv } from "@/config/env";
import { toIceServers, type IceServer } from "./ice";

export type { IceServer } from "./ice";

/**
 * ICE servers for a WebRTC call. TURN relays calls that can't connect directly
 * (common on mobile data behind carrier NAT). Providers, first one configured wins:
 * - Cloudflare Realtime TURN: short-lived credentials per call; the key never
 *   reaches the browser. https://developers.cloudflare.com/realtime/turn/generate-credentials/
 * - A TURN server with a fixed login (TURN_URLS/USERNAME/CREDENTIAL), e.g. Metered's
 *   Free 20 GB plan, which has no API for short-lived credentials.
 * Neither: STUN only, which connects most Wi-Fi calls but not every call on mobile data.
 */
const STUN_ONLY: IceServer[] = [{ urls: ["stun:stun.cloudflare.com:3478"] }];

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

export async function iceServers(ttlSeconds = 4 * 3600): Promise<{ servers: IceServer[]; relay: boolean }> {
  const env = serverEnv();
  try {
    if (env.CLOUDFLARE_TURN_KEY_ID && env.CLOUDFLARE_TURN_API_TOKEN)
      return {
        servers: await cloudflare(env.CLOUDFLARE_TURN_KEY_ID, env.CLOUDFLARE_TURN_API_TOKEN, ttlSeconds),
        relay: true,
      };
    if (env.TURN_URLS.length > 0 && env.TURN_USERNAME && env.TURN_CREDENTIAL)
      return {
        servers: [
          ...STUN_ONLY,
          { urls: env.TURN_URLS, username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL },
        ],
        relay: true,
      };
  } catch (error) {
    console.error("[turn] falling back to STUN only", error);
  }
  return { servers: STUN_ONLY, relay: false };
}
