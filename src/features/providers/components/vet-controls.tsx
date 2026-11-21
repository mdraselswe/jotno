"use client";

import { Send } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { setAvailableNow, submitForReview } from "../server/actions";

/** The big "I'm available now" switch on the vet dashboard. */
export function AvailableNowSwitch({ on, until }: { on: boolean; until: string | null }) {
  const t = useT();
  const [optimistic, setOptimistic] = useOptimistic(on);
  const [, start] = useTransition();
  return (
    <label
      className={cn(
        "flex items-center justify-between gap-4 rounded-(--radius-xl) border-(length:--border-w) p-(--card-pad) transition-colors",
        optimistic ? "border-success/40 bg-success/10" : "bg-card",
      )}
    >
      <span className="grid gap-1">
        <span className="flex items-center gap-2 font-medium">
          <span
            aria-hidden="true"
            className={cn(
              "size-2.5 rounded-full",
              optimistic ? "live-ping bg-success" : "bg-muted-foreground/40",
            )}
          />
          {optimistic ? t("vet.availableOn") : t("vet.availableOff")}
        </span>
        <span className="text-sm text-muted-foreground">
          {optimistic && until ? t("vet.availableUntil", { time: until }) : t("vet.availableHint")}
        </span>
      </span>
      <Switch
        checked={optimistic}
        onCheckedChange={(checked) =>
          start(async () => {
            setOptimistic(checked);
            const r = await setAvailableNow(checked);
            if (!r.ok) toast.error(t(r.error));
          })
        }
      />
    </label>
  );
}

export function SubmitForReviewButton() {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await submitForReview(locale);
          if (r.ok) toast.success(t("vet.submitted"));
          else toast.error(t(r.error));
        })
      }
    >
      <Send aria-hidden="true" />
      {pending ? t("common.saving") : t("vet.submit")}
    </Button>
  );
}
