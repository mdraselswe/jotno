"use client";

import { Check, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";
import { buyFeatured } from "../server/featured";

/** Vet: one featured pack (days + price) with a pay button. */
export function BuyFeaturedButton({
  index,
  label,
  disabled,
}: {
  index: number;
  label: string;
  disabled?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const res = await buyFeatured(locale, index);
          if (!res.ok) toast.error(t(res.error));
        })
      }
    >
      <Sparkles aria-hidden="true" />
      {pending ? t("pay.redirecting") : label}
    </Button>
  );
}

/**
 * Vet: pick a featured pack (cards as a radio group, the best per-day price
 * marked) and pay for it with one button. Prices are integer poisha.
 */
export function FeaturedPlans({
  packs,
  disabled = false,
}: {
  packs: readonly { days: number; price: number }[];
  disabled?: boolean;
}) {
  const t = useT();
  const fmt = useFormatter();
  const locale = useLocale();
  // Per-day price rounded to whole taka (still poisha), just for comparison.
  const perDay = packs.map((p) => Math.round(p.price / Math.max(p.days, 1) / 100) * 100);
  const cheapest = perDay.length > 1 ? perDay.indexOf(Math.min(...perDay)) : -1;
  const [picked, setPicked] = useState(cheapest >= 0 ? cheapest : 0);
  const [pending, start] = useTransition();
  const pack = packs[picked];

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-3" disabled={disabled}>
        <legend className="mb-3 font-heading text-lg font-bold">{t("vetui.feat.pick")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {packs.map((p, i) => {
            const on = i === picked;
            return (
              <label
                key={p.days}
                className={cn(
                  "relative grid cursor-pointer gap-3 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 transition-[box-shadow,translate] duration-(--motion-base) ease-(--ease-ui) has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:opacity-60 sm:p-5",
                  on
                    ? "ring-2 ring-primary"
                    : "ring-foreground/8 hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover)",
                )}
              >
                <input
                  type="radio"
                  name="featured-pack"
                  value={i}
                  checked={on}
                  onChange={() => setPicked(i)}
                  className="sr-only"
                />
                <span className="flex items-start justify-between gap-3">
                  <span className="grid gap-1">
                    <span className="font-heading text-lg font-bold">
                      {t("featured.days", { n: fmt.number(p.days) })}
                    </span>
                    {i === cheapest ? (
                      <span className="w-fit rounded-full bg-highlight px-2.5 py-0.5 text-xs font-bold text-highlight-foreground">
                        {t("vetui.feat.best")}
                      </span>
                    ) : null}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full ring-1 transition-colors duration-(--motion-fast)",
                      on ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-foreground/20",
                    )}
                  >
                    {on ? <Check className="size-3.5" /> : null}
                  </span>
                </span>
                <span className="grid gap-0.5">
                  <span className="font-heading text-3xl leading-none font-bold tabular-nums">
                    {taka(fmt, p.price)}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {t("vetui.feat.perDay", { amount: taka(fmt, perDay[i] ?? 0) })}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <Button
        variant="brand"
        size="lg"
        effect="shine"
        disabled={disabled || pending || !pack}
        className="justify-self-start max-sm:w-full"
        onClick={() =>
          start(async () => {
            const res = await buyFeatured(locale, picked);
            if (!res.ok) toast.error(t(res.error));
          })
        }
      >
        <Sparkles aria-hidden="true" />
        {pending ? t("pay.redirecting") : t("vetui.feat.pay", { amount: pack ? taka(fmt, pack.price) : "" })}
      </Button>
    </div>
  );
}
