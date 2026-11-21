"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/config/env";
import { useT } from "@/i18n/client";
import { removePushSubscription, savePushSubscription } from "../server/actions";

type State = "loading" | "unsupported" | "blocked" | "off" | "on";

const keyBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/** Turns web push on or off for this device (needs the service worker, so production builds only). */
export function PushToggle() {
  const t = useT();
  const [state, setState] = useState<State>("loading");
  const [pending, start] = useTransition();

  useEffect(() => {
    // Async so every state update lands after the effect, not during it.
    const detect = async (): Promise<State> => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      )
        return "unsupported";
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

  if (state === "loading")
    return <div className="h-(--control-h) w-32 animate-pulse rounded-(--control-radius) bg-muted" />;
  if (state === "unsupported")
    return <p className="text-sm text-muted-foreground">{t("settings.pushUnsupported")}</p>;
  if (state === "blocked")
    return <p className="text-sm text-muted-foreground">{t("settings.pushBlocked")}</p>;
  return state === "on" ? (
    <div>
      <Button variant="outline" onClick={turnOff} disabled={pending}>
        <BellOff aria-hidden="true" />
        {t("settings.pushOff")}
      </Button>
    </div>
  ) : (
    <div>
      <Button onClick={turnOn} disabled={pending}>
        <Bell aria-hidden="true" />
        {t("settings.pushOn")}
      </Button>
    </div>
  );
}
