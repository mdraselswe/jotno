"use client";

import { useState } from "react";
import { useFormatter } from "@/i18n/client";

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
      <div className="grid min-w-0 justify-items-center gap-1 rounded-(--radius-2xl) bg-foreground px-5 py-7 text-center text-background sm:px-8 md:min-w-64">
        <span className="text-sm opacity-75">{labels.monthly}</span>
        <output
          aria-live="polite"
          className="max-w-full font-heading text-4xl font-extrabold tracking-tight break-all tabular-nums sm:text-5xl"
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
