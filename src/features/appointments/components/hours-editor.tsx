"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useT } from "@/i18n/client";
import { saveHours } from "../server/actions";

export interface HoursRow {
  weekday: number;
  start: string;
  end: string;
  slotMinutes: number;
}

const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5]; // Saturday first, as Bangladesh weeks go
const DAY_KEYS = [
  "appt.sun",
  "appt.mon",
  "appt.tue",
  "appt.wed",
  "appt.thu",
  "appt.fri",
  "appt.sat",
] as const;

/** Vet: weekly clinic hours, one or more blocks per day. */
export function HoursEditor({ initial }: { initial: HoursRow[] }) {
  const t = useT();
  const [rows, setRows] = useState<HoursRow[]>(initial);
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<HoursRow>) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const add = (weekday: number) =>
    setRows((r) => [...r, { weekday, start: "17:00", end: "21:00", slotMinutes: 20 }]);
  const remove = (i: number) => setRows((r) => r.filter((_, j) => j !== i));

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveHours(rows);
          if (res.ok) toast.success(t("common.saved"));
          else toast.error(t(res.error));
        });
      }}
    >
      <ul className="grid gap-3">
        {WEEK_ORDER.map((weekday) => {
          const blocks = rows.map((row, i) => ({ row, i })).filter((x) => x.row.weekday === weekday);
          return (
            <li
              key={weekday}
              className="grid gap-2 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad)"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{t(DAY_KEYS[weekday] ?? "appt.sun")}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => add(weekday)}>
                  <Plus aria-hidden="true" />
                  {t("appt.addHours")}
                </Button>
              </div>
              {blocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("appt.closed")}</p>
              ) : null}
              {blocks.map(({ row, i }) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input
                    type="time"
                    aria-label={t("appt.from")}
                    value={row.start}
                    onChange={(e) => update(i, { start: e.target.value })}
                    className="w-32"
                    required
                  />
                  <span aria-hidden="true">–</span>
                  <Input
                    type="time"
                    aria-label={t("appt.to")}
                    value={row.end}
                    onChange={(e) => update(i, { end: e.target.value })}
                    className="w-32"
                    required
                  />
                  <NativeSelect
                    aria-label={t("appt.slotLength")}
                    value={String(row.slotMinutes)}
                    onChange={(e) => update(i, { slotMinutes: Number(e.target.value) })}
                  >
                    {[10, 15, 20, 30, 45, 60].map((m) => (
                      <option key={m} value={m}>
                        {t("appt.minutesEach", { n: m })}
                      </option>
                    ))}
                  </NativeSelect>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("common.remove")}
                    onClick={() => remove(i)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </li>
          );
        })}
      </ul>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}
