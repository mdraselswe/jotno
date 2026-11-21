import "server-only";
import { publicEnv, serverEnv } from "@/config/env";
import { encryptPayload, vapidHeader, type PushTarget } from "./crypto";

export type { PushTarget };
const enc = new TextEncoder();

/**
 * Web Push with WebCrypto only (runs on Cloudflare Workers and Node):
 * VAPID (RFC 8292) + aes128gcm payload encryption (RFC 8291).
 */

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export type PushOutcome = "sent" | "gone" | "failed" | "disabled";

/** Sends one notification. "gone" means the subscription should be deleted. */
export async function sendPush(target: PushTarget, payload: PushPayload): Promise<PushOutcome> {
  const publicKey = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const { VAPID_PRIVATE_KEY, VAPID_SUBJECT } = serverEnv();
  if (!publicKey || !VAPID_PRIVATE_KEY) return "disabled";
  try {
    const body = await encryptPayload(target, enc.encode(JSON.stringify(payload)));
    const res = await fetch(target.endpoint, {
      method: "POST",
      headers: {
        Authorization: await vapidHeader(target.endpoint, publicKey, VAPID_PRIVATE_KEY, VAPID_SUBJECT),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "high",
        ...(payload.tag ? { Topic: payload.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) } : {}),
      },
      body,
    });
    if (res.status === 404 || res.status === 410) return "gone";
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
