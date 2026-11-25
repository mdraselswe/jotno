"use client";

import { Lock, Radio, Send } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { setAvailableNow, submitForReview } from "../server/actions";

/**
 * The big "I'm available now" control on the vet dashboard: a card whose
 * colour, dot and words all say the current state, with one large switch.
 * `locked`: not verified yet, so the switch is off and explains why.
 */
export function AvailableNowSwitch({
  on,
  until,
  locked = false,
}: {
  on: boolean;
  until: string | null;
  locked?: boolean;
}) {
  const t = useT();
  const [optimistic, setOptimistic] = useOptimistic(on && !locked);
  const [pending, start] = useTransition();

  function toggle(checked: boolean) {
    start(async () => {
      setOptimistic(checked);
      const r = await setAvailableNow(checked);
      if (!r.ok) toast.error(t(r.error));
      else toast.success(checked ? t("vetui.avail.onToast") : t("vetui.avail.offToast"));
    });
  }

  return (
    <section
      aria-labelledby="vet-available-title"
      className={cn(
        "flex items-center gap-4 rounded-(--radius-2xl) p-4 shadow-(--shadow-card) ring-1 transition-colors duration-(--motion-base) ease-(--ease-ui) sm:p-5",
        optimistic ? "bg-success/10 ring-success/30" : "bg-card ring-foreground/6",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative grid size-12 shrink-0 place-items-center rounded-full transition-colors duration-(--motion-base)",
          optimistic ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {locked ? <Lock className="size-5" /> : <Radio className="size-5" />}
        {optimistic ? (
          <span className="absolute -end-0.5 -top-0.5 size-3.5 rounded-full bg-success ring-2 ring-card">
            <span className="absolute inset-0 live-ping rounded-full bg-success" />
          </span>
        ) : null}
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p id="vet-available-title" className="flex flex-wrap items-center gap-x-2 text-xs font-semibold">
          <span className="text-muted-foreground">{t("vetui.avail.title")}</span>
          <span
            className={cn(
              "rounded-full px-2 py-px",
              optimistic
                ? "bg-success/15 text-success dark:text-[color-mix(in_oklch,var(--success),white_35%)]"
                : "bg-muted text-foreground/70",
            )}
          >
            {optimistic ? t("vetui.avail.online") : t("vetui.avail.offline")}
          </span>
        </p>
        <p className="font-heading text-lg leading-snug font-bold">
          {optimistic ? t("vet.availableOn") : t("vet.availableOff")}
        </p>
        <p id="vet-available-hint" className="text-sm text-pretty text-muted-foreground">
          {locked
            ? t("vetui.avail.locked")
            : optimistic && until
              ? t("vet.availableUntil", { time: until })
              : t("vet.availableHint")}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        aria-label={t("vetui.avail.switch")}
        aria-describedby="vet-available-hint"
        disabled={locked}
        aria-busy={pending || undefined}
        onClick={() => toggle(!optimistic)}
        className={cn(
          "relative inline-flex h-9 w-16 shrink-0 items-center rounded-full p-1 transition-colors duration-(--motion-base) ease-(--ease-ui) outline-none after:absolute after:-inset-2 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          optimistic ? "bg-success" : "bg-input dark:bg-input/80",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-7 rounded-full bg-background shadow-(--shadow-control) transition-transform duration-(--motion-base) ease-(--ease-press)",
            optimistic ? "translate-x-7 rtl:-translate-x-7" : "translate-x-0",
          )}
        />
      </button>
    </section>
  );
}

export function SubmitForReviewButton() {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="brand"
      size="lg"
      disabled={pending}
      className="max-sm:w-full"
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
