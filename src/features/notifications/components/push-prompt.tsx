"use client";

import { BellRing } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { usePush } from "./use-push";

const KEY = "jotno.pushPrompt.until";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const CHANGED = "jotno:push-prompt";

function snoozed(): boolean {
  try {
    return Number(window.localStorage.getItem(KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/**
 * Asks to turn on notifications where it matters (a chat, the vet's dashboard):
 * calls and replies then reach the phone even when Jotno is closed. Hidden once
 * on, blocked, unsupported, or after "Not now" (for a week).
 */
export function PushPrompt({ className }: { className?: string }) {
  const t = useT();
  const { state, pending, turnOn } = usePush();
  // Server snapshot "snoozed": nothing in the server HTML, so no hydration mismatch.
  const hidden = useSyncExternalStore(subscribe, snoozed, () => true);
  if (hidden || (state !== "off" && state !== "ios")) return null;

  function later() {
    try {
      window.localStorage.setItem(KEY, String(Date.now() + SNOOZE_MS));
    } catch {
      // Storage blocked: the prompt just shows again next time.
    }
    window.dispatchEvent(new Event(CHANGED));
  }

  return (
    <div
      role="region"
      aria-labelledby="push-prompt-text"
      className={cn(
        "flex flex-col gap-3 rounded-(--radius-xl) border bg-info/10 p-3 text-sm sm:flex-row sm:items-center",
        className,
      )}
    >
      <BellRing aria-hidden="true" className="size-5 shrink-0 text-info" />
      <p id="push-prompt-text" className="flex-1">
        {t(state === "ios" ? "call.pushPromptIos" : "call.pushPrompt")}
      </p>
      <div className="flex gap-2">
        {state === "off" ? (
          <Button size="sm" onClick={turnOn} disabled={pending}>
            {t("call.pushOn")}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={later}>
          {t("call.pushLater")}
        </Button>
      </div>
    </div>
  );
}
