"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { features } from "@/config";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useConnectionStatus } from "../use-connection-status";

/**
 * A pill under the header: slides in when the connection drops, turns green
 * with "Back online" when it returns, then slides away by itself.
 * The live region is always in the page so screen readers announce both.
 * CSS transitions only (no motion library in every page's JavaScript); the
 * global reduced-motion rule makes them instant.
 */
export function ConnectionBanner() {
  const t = useT();
  const status = useConnectionStatus();
  const visible = status !== "online";
  // Keep the last message while the pill slides away.
  const [shown, setShown] = useState(status);
  if (visible && shown !== status) setShown(status);
  const offline = shown === "offline";

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-50 flex justify-center px-4"
    >
      {shown !== "online" && (
        <div
          data-status={shown}
          aria-hidden={!visible}
          className={cn(
            "flex items-center gap-2 overflow-hidden rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-[opacity,translate,scale,background-color,color] duration-(--motion-slow) ease-(--ease-spring) starting:-translate-y-4 starting:scale-95 starting:opacity-0",
            offline ? "bg-foreground text-background" : "bg-success text-success-foreground",
            !visible &&
              "invisible -translate-y-4 scale-95 opacity-0 transition-[opacity,translate,scale,visibility] transition-discrete",
          )}
        >
          <span
            key={shown}
            className="flex items-center gap-2 motion-safe:animate-[sr-in_var(--motion-slow)_var(--ease-out-expo)_backwards]"
          >
            {offline ? (
              <WifiOff className="size-4 shrink-0 animate-pulse" aria-hidden="true" />
            ) : (
              <Wifi className="size-4 shrink-0" aria-hidden="true" />
            )}
            {offline
              ? t(features.pwa ? "connection.offlineCached" : "connection.offline")
              : t("connection.online")}
          </span>
        </div>
      )}
    </div>
  );
}
