"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFormatter } from "@/i18n/client";

/** Share the page: the phone's share sheet where there is one, else copy the link. */
export function ShareButton({ label, text, copied }: { label: string; text: string; copied: string }) {
  const [done, setDone] = useState(false);
  async function share() {
    const url = window.location.href.split("#")[0] ?? window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      toast.success(copied);
      window.setTimeout(() => setDone(false), 2500);
    } catch {
      // Share sheet closed, or clipboard blocked: nothing to do.
    }
  }
  return (
    <Button type="button" size="lg" variant="outline" onClick={share}>
      {done ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
      {label}
    </Button>
  );
}

/**
 * Vet earnings example: chats a day × fee × working days, minus commission.
 * Money in poisha; the fee slider moves in ৳50 steps within the allowed range.
 */
export function EarningsCalc({
  minFee,
  maxFee,
  commissionBps,
  labels,
}: {
  minFee: number;
  maxFee: number;
  commissionBps: number;
  labels: { chats: string; fee: string; perDay: string; monthly: string; keep: string; note: string };
}) {
  const fmt = useFormatter();
  const [chats, setChats] = useState(4);
  const [fee, setFee] = useState(Math.min(Math.max(40_000, minFee), maxFee));
  const days = 26;
  const monthly = Math.round((chats * fee * days * (10_000 - commissionBps)) / 10_000);
  const taka = (poisha: number) => fmt.money(poisha / 100, { maximumFractionDigits: 0 });
  const fill = (v: number, min: number, max: number) => `${((v - min) / (max - min)) * 100}%`;
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
      <div className="grid gap-7">
        <label className="grid gap-3">
          <span className="flex items-baseline justify-between gap-3 font-medium">
            {labels.chats}
            <span className="font-heading text-xl font-bold tabular-nums">
              {labels.perDay.replace("{n}", fmt.number(chats))}
            </span>
          </span>
          <input
            type="range"
            min={1}
            max={20}
            value={chats}
            onChange={(e) => setChats(Number(e.target.value))}
            className="range"
            style={{ "--fill": fill(chats, 1, 20) } as React.CSSProperties}
          />
        </label>
        <label className="grid gap-3">
          <span className="flex items-baseline justify-between gap-3 font-medium">
            {labels.fee}
            <span className="font-heading text-xl font-bold tabular-nums">{taka(fee)}</span>
          </span>
          <input
            type="range"
            min={minFee}
            max={Math.min(maxFee, 150_000)}
            step={5_000}
            value={fee}
            onChange={(e) => setFee(Number(e.target.value))}
            className="range"
            style={{ "--fill": fill(fee, minFee, Math.min(maxFee, 150_000)) } as React.CSSProperties}
          />
        </label>
        <p className="text-xs text-pretty text-muted-foreground">{labels.note}</p>
      </div>
      <div className="grid justify-items-center gap-1 rounded-(--radius-2xl) bg-foreground px-8 py-7 text-center text-background md:min-w-64">
        <span className="text-sm opacity-75">{labels.monthly}</span>
        <output
          aria-live="polite"
          className="font-heading text-5xl font-extrabold tracking-tight tabular-nums"
        >
          {taka(monthly)}
        </output>
        <span className="max-w-52 text-xs text-pretty opacity-70">
          {labels.keep.replace("{days}", fmt.number(days))}
        </span>
      </div>
    </div>
  );
}
