"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { publicEnv } from "@/config/env";
import { useT } from "@/i18n/client";
import { pushSupport, type PushEnvironment, type PushSupport } from "../push-support";
import { removePushSubscription, savePushSubscription } from "../server/actions";

export type PushState = "loading" | Exclude<PushSupport, "ready"> | "off" | "on";

/** The endpoint already saved for the signed-in person in this tab session (one save per session). */
const SYNCED = "jotno.push.synced";
/** The service worker registers on `load`; a first visit can mount before that. */
const WORKER_WAIT_MS = 10_000;

const keyBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

function readPushEnvironment(): PushEnvironment {
  const hasNotification = typeof Notification !== "undefined";
  return {
    hasKey: Boolean(publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    hasServiceWorker: "serviceWorker" in navigator,
    hasPushManager: "PushManager" in window,
    hasNotification,
    permission: hasNotification ? Notification.permission : null,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    standalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  };
}

/** The active service worker, waiting a little for one that is still registering. */
async function workerRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  const now = await navigator.serviceWorker.getRegistration();
  if (now?.active) return now;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<undefined>((resolve) => setTimeout(resolve, WORKER_WAIT_MS)),
  ]);
}

/** A subscription made with an older VAPID key can't receive anything any more. */
function sameKey(sub: PushSubscription, key: string): boolean {
  const used = sub.options.applicationServerKey;
  if (!used) return true;
  const a = new Uint8Array(used);
  const b = keyBytes(key);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Saves this device for the signed-in person, once per tab session (also after an account switch). */
async function syncSubscription(sub: PushSubscription) {
  try {
    if (window.sessionStorage.getItem(SYNCED) === sub.endpoint) return;
  } catch {
    // Storage blocked: save every time, it's an upsert.
  }
  const r = await savePushSubscription(sub.toJSON());
  if (!r.ok) return;
  try {
    window.sessionStorage.setItem(SYNCED, sub.endpoint);
  } catch {
    // Nothing to remember it in.
  }
}

/**
 * Stops this device getting the signed-in person's notifications. Call it on
 * sign-out, before the session ends (the server needs to know whose it is),
 * so the next person on a shared phone doesn't get someone else's reminders.
 */
export async function forgetPushOnThisDevice(): Promise<void> {
  try {
    window.sessionStorage.removeItem(SYNCED);
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    if (!sub) return;
    await removePushSubscription(sub.endpoint);
    await sub.unsubscribe();
  } catch {
    // Sign-out must not fail because of push.
  }
}

/** This device's web push state, and turning it on or off (production builds only: needs the service worker). */
export function usePush() {
  const t = useT();
  const [state, setState] = useState<PushState>("loading");
  const [pending, start] = useTransition();
  const key = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let alive = true;
    // Async so every state update lands after the effect, not during it.
    const detect = async (): Promise<PushState> => {
      const support = pushSupport(readPushEnvironment());
      if (support !== "ready") return support;
      const reg = await workerRegistration();
      if (!reg) return "unsupported";
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return "off";
      if (!sameKey(sub, key)) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
        return "off";
      }
      // Permission can be taken back in the browser settings while the subscription stays.
      if (Notification.permission !== "granted") return "off";
      await syncSubscription(sub);
      return "on";
    };
    void detect()
      .catch((): PushState => "unsupported")
      .then((s) => {
        if (alive) setState(s);
      });
    return () => {
      alive = false;
    };
  }, [key]);

  function turnOn() {
    // requestPermission runs synchronously inside the tap: iOS only asks from a user gesture.
    start(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "blocked" : "off");
          return;
        }
        const reg = await workerRegistration();
        if (!reg) throw new Error("no service worker");
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
        const r = await savePushSubscription(sub.toJSON());
        if (!r.ok) throw new Error("not saved");
        try {
          window.sessionStorage.setItem(SYNCED, sub.endpoint);
        } catch {
          // Fine: the next page saves it again.
        }
        setState("on");
        toast.success(t("settings.pushDone"));
      } catch {
        // Push service down, Brave without Google push, private windows…: say so, don't crash the page.
        toast.error(t("settings.pushFailed"));
        setState(
          typeof Notification !== "undefined" && Notification.permission === "denied" ? "blocked" : "off",
        );
      }
    });
  }

  function turnOff() {
    start(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await removePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        window.sessionStorage.removeItem(SYNCED);
        setState("off");
      } catch {
        toast.error(t("common.genericError"));
      }
    });
  }

  return { state, pending, turnOn, turnOff };
}
