/**
 * Can this device get web push, and if not, what should we tell the person?
 * Pure, so it is unit tested; `readPushEnvironment()` in use-push.ts gathers
 * the browser facts.
 */
export type PushSupport =
  /** Worth asking: the browser can subscribe. */
  | "ready"
  /** iPhone/iPad in a browser tab: push works only from the Home Screen app (iOS 16.4+). */
  | "ios"
  /** Installed on an iPhone/iPad older than iOS 16.4. */
  | "ios-update"
  /** Facebook, Messenger, Instagram and other in-app browsers (Android WebView): no push. */
  | "in-app"
  /** The person said no; only the browser's site settings can undo it. */
  | "blocked"
  /** Any other browser without push (or push not configured on this site). */
  | "unsupported";

export interface PushEnvironment {
  /** NEXT_PUBLIC_VAPID_PUBLIC_KEY is set. */
  hasKey: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  /** Notification.permission, or null without the Notification API. */
  permission: "default" | "granted" | "denied" | null;
  userAgent: string;
  /** navigator.maxTouchPoints, to tell iPadOS (which reports as a Mac) from a Mac. */
  maxTouchPoints: number;
  /** Running as an installed app (display-mode: standalone, or navigator.standalone on iOS). */
  standalone: boolean;
}

/** In-app browsers: Facebook/Messenger (FBAN, FBAV, FB_IAB), Instagram, LINE, and Android WebView (`; wv)`). */
const IN_APP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|\bLine\/|; wv\)/;

export function pushSupport(env: PushEnvironment): PushSupport {
  if (!env.hasKey) return "unsupported";
  const ua = env.userAgent;
  if (IN_APP.test(ua)) return "in-app";
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && env.maxTouchPoints > 1);
  if (ios && !env.standalone) return "ios";
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification)
    return ios ? "ios-update" : "unsupported";
  if (env.permission === "denied") return "blocked";
  return "ready";
}
