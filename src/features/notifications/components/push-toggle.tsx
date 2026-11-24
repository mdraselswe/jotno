"use client";

import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { usePush } from "./use-push";

/** Turns web push on or off for this device (needs the service worker, so production builds only). */
export function PushToggle() {
  const t = useT();
  const { state, pending, turnOn, turnOff } = usePush();

  if (state === "loading")
    return <div className="h-(--control-h) w-32 animate-pulse rounded-(--control-radius) bg-muted" />;
  if (state === "unsupported")
    return <p className="text-sm text-muted-foreground">{t("settings.pushUnsupported")}</p>;
  if (state === "ios") return <p className="text-sm text-muted-foreground">{t("call.pushPromptIos")}</p>;
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
