"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { publicEnv } from "@/config/env";
import { useT } from "@/i18n/client";
import { removePushSubscription, savePushSubscription } from "../server/actions";

export type PushState = "loading" | "unsupported" | "ios" | "blocked" | "off" | "on";

const keyBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/** iPhone/iPad Safari: web push works only after "Add to Home Screen". */
function iosNotInstalled(): boolean {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

/** This device's web push state, and turning it on or off (production builds only: needs the service worker). */
export function usePush() {
  const t = useT();
  const [state, setState] = useState<PushState>("loading");
  const [pending, start] = useTransition();

  useEffect(() => {
    // Async so every state update lands after the effect, not during it.
    const detect = async (): Promise<PushState> => {
      if (!publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !("serviceWorker" in navigator)) return "unsupported";
      if (!("PushManager" in window)) return iosNotInstalled() ? "ios" : "unsupported";
      if (Notification.permission === "denied") return "blocked";
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return "unsupported";
      return (await reg.pushManager.getSubscription()) ? "on" : "off";
    };
    void detect().then(setState);
  }, []);

  function turnOn() {
    start(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });
      const r = await savePushSubscription(sub.toJSON());
      if (r.ok) setState("on");
      else toast.error(t("common.genericError"));
    });
  }

  function turnOff() {
    start(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    });
  }

  return { state, pending, turnOn, turnOff };
}
