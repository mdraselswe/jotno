"use client";

import { Bell, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { usePush, type PushState } from "./use-push";

/** What to say on a device where push can't be turned on from here. */
export const PUSH_HELP: Record<Exclude<PushState, "loading" | "on" | "off">, MessageKey> = {
  ios: "call.pushPromptIos",
  "ios-update": "settings.pushIosUpdate",
  "in-app": "settings.pushInApp",
  blocked: "settings.pushBlocked",
  unsupported: "settings.pushUnsupported",
};

/** Turns web push on or off for this device (needs the service worker, so production builds only). */
export function PushToggle() {
  const t = useT();
  const { state, pending, turnOn, turnOff } = usePush();

  if (state === "loading")
    return <div className="h-16 w-full animate-pulse rounded-(--radius-xl) bg-muted" role="status" />;
  if (state !== "on" && state !== "off")
    return (
      <div className="flex items-start gap-3 rounded-(--radius-xl) bg-muted/60 p-3 text-sm text-muted-foreground">
        <BellOff aria-hidden="true" className="mt-0.5 size-4.5 shrink-0" />
        <p className="grid gap-1">
          <span className="text-foreground">{t(PUSH_HELP[state])}</span>
          <span>{t("settings.pushFallback")}</span>
        </p>
      </div>
    );
  const on = state === "on";
  return (
    <div className="flex items-center gap-3 rounded-(--radius-xl) bg-muted/50 p-3 ring-1 ring-foreground/6">
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-(--radius-lg)",
          on ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
        )}
      >
        {on ? (
          <Bell aria-hidden="true" className="size-5" />
        ) : (
          <BellOff aria-hidden="true" className="size-5" />
        )}
      </span>
      <span className="grid min-w-0 flex-1">
        <span id="push-label" className="text-sm font-semibold">
          {t("ownerui.settings.pushLabel")}
        </span>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {on ? t("ownerui.settings.on") : t("ownerui.settings.off")}
        </span>
      </span>
      <Switch
        aria-labelledby="push-label"
        checked={on}
        disabled={pending}
        onCheckedChange={(next) => void (next ? turnOn() : turnOff())}
      />
    </div>
  );
}
