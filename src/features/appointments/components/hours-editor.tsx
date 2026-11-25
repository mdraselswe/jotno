"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/layout/app-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { useFormatter, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { saveHours } from "../server/actions";
import { toHhmm, toMinutes } from "../slots";

export interface HoursRow {
  weekday: number;
  start: string;
  end: string;
  slotMinutes: number;
}

interface Block {
  start: string;
  end: string;
  slotMinutes: number;
}
interface Day {
  open: boolean;
  blocks: Block[];
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
const SLOT_CHOICES = [10, 15, 20, 30, 45, 60];
/** The server keeps at most this many blocks a week (hoursSchema in server/actions.ts). */
const MAX_BLOCKS = 42;

function toDays(rows: HoursRow[]): Day[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    const blocks = rows
      .filter((r) => r.weekday === weekday)
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
      .map(({ start, end, slotMinutes }) => ({ start, end, slotMinutes }));
    return { open: blocks.length > 0, blocks };
  });
}

function toRows(days: Day[]): HoursRow[] {
  return days.flatMap((d, weekday) => (d.open ? d.blocks.map((b) => ({ weekday, ...b })) : []));
}

/** A sensible next block: an evening chamber, or a while after the day's last block. */
function nextBlock(blocks: Block[]): Block {
  const last = blocks.at(-1);
  if (!last) return { start: "17:00", end: "21:00", slotMinutes: 20 };
  const start = Math.min(toMinutes(last.end) + 60, 22 * 60);
  return {
    start: toHhmm(start),
    end: toHhmm(Math.min(start + 180, 23 * 60 + 30)),
    slotMinutes: last.slotMinutes,
  };
}

type BlockError = "vetui.sched.errOrder" | "vetui.sched.errOverlap" | "vetui.sched.errShort";

/** What's wrong with one block, checked against the other blocks of its day. */
function blockError(blocks: Block[], i: number): BlockError | null {
  const b = blocks[i];
  if (!b || !/^\d{2}:\d{2}$/.test(b.start) || !/^\d{2}:\d{2}$/.test(b.end)) return "vetui.sched.errOrder";
  const s = toMinutes(b.start);
  const e = toMinutes(b.end);
  if (e <= s) return "vetui.sched.errOrder";
  const clash = blocks.some((o, j) => j !== i && toMinutes(o.start) < e && s < toMinutes(o.end));
  if (clash) return "vetui.sched.errOverlap";
  if (e - s < b.slotMinutes) return "vetui.sched.errShort";
  return null;
}

/**
 * Vet: weekly clinic hours. One row per day with an open/closed switch, one
 * or more time blocks, "copy to all days", checks as you type, and a save
 * bar that stays in reach on phones.
 */
export function HoursEditor({ initial }: { initial: HoursRow[] }) {
  const t = useT();
  const fmt = useFormatter();
  const [days, setDays] = useState<Day[]>(() => toDays(initial));
  const [saved, setSaved] = useState<HoursRow[]>(() => toRows(toDays(initial)));
  const [pending, start] = useTransition();

  const dayName = (weekday: number) => t(DAY_KEYS[weekday] ?? "appt.sun");
  const patchDay = (weekday: number, fn: (d: Day) => Day) =>
    setDays((all) => all.map((d, w) => (w === weekday ? fn(d) : d)));

  const setOpen = (weekday: number, open: boolean) =>
    patchDay(weekday, (d) => ({ open, blocks: open && d.blocks.length === 0 ? [nextBlock([])] : d.blocks }));
  const addBlock = (weekday: number) =>
    patchDay(weekday, (d) => ({ ...d, blocks: [...d.blocks, nextBlock(d.blocks)] }));
  const updateBlock = (weekday: number, i: number, patch: Partial<Block>) =>
    patchDay(weekday, (d) => ({ ...d, blocks: d.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const removeBlock = (weekday: number, i: number) =>
    patchDay(weekday, (d) => {
      const blocks = d.blocks.filter((_, j) => j !== i);
      return { open: blocks.length > 0, blocks };
    });
  const copyToAll = (weekday: number) => {
    const source = days[weekday];
    if (!source) return;
    setDays(days.map(() => ({ open: source.open, blocks: source.blocks.map((b) => ({ ...b })) })));
    toast.success(t("vetui.sched.copied", { day: dayName(weekday) }));
  };

  const rows = toRows(days);
  const dirty = JSON.stringify(rows) !== JSON.stringify(saved);
  const errors = days.map((d) => (d.open ? d.blocks.map((_, i) => blockError(d.blocks, i)) : []));
  const hasErrors = errors.some((list) => list.some(Boolean));
  const tooMany = rows.length > MAX_BLOCKS;
  const openDays = days.filter((d) => d.open && d.blocks.length > 0).length;
  const slots = days.reduce(
    (n, d, w) =>
      n +
      (d.open
        ? d.blocks.reduce(
            (m, b, i) =>
              errors[w]?.[i]
                ? m
                : m + Math.floor((toMinutes(b.end) - toMinutes(b.start)) / Math.max(b.slotMinutes, 1)),
            0,
          )
        : 0),
    0,
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (hasErrors) {
      toast.error(t("vetui.sched.fixFirst"));
      return;
    }
    if (tooMany) {
      toast.error(t("vetui.sched.tooMany", { n: fmt.number(MAX_BLOCKS) }));
      return;
    }
    const snapshot = rows;
    start(async () => {
      const res = await saveHours(snapshot);
      if (res.ok) {
        setSaved(snapshot);
        toast.success(t("common.saved"));
      } else toast.error(t(res.error));
    });
  }

  return (
    <form className="grid gap-4" onSubmit={submit} noValidate>
      <ul className="grid gap-3">
        {WEEK_ORDER.map((weekday) => {
          const day = days[weekday] ?? { open: false, blocks: [] };
          const name = dayName(weekday);
          const switchId = `day-${weekday}`;
          return (
            <li
              key={weekday}
              className={cn(
                "grid gap-3 rounded-(--radius-2xl) p-3 shadow-(--shadow-card) ring-1 transition-colors duration-(--motion-fast) sm:p-4",
                day.open ? "bg-card ring-foreground/6" : "bg-card/60 ring-foreground/5",
              )}
            >
              <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2">
                <Switch
                  id={switchId}
                  checked={day.open}
                  onCheckedChange={(c) => setOpen(weekday, c)}
                  aria-label={t("vetui.sched.dayOpen", { day: name })}
                />
                <label htmlFor={switchId} className="min-w-0 flex-1 cursor-pointer font-semibold">
                  {name}
                </label>
                {day.open ? (
                  <>
                    <StatusBadge tone="success">{t("vetui.sched.open")}</StatusBadge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToAll(weekday)}
                      aria-label={`${t("vetui.sched.copyAll")} (${name})`}
                    >
                      <Copy aria-hidden="true" />
                      <span className="max-sm:hidden">{t("vetui.sched.copyAll")}</span>
                    </Button>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">{t("appt.closed")}</span>
                )}
              </div>

              {day.open ? (
                <div className="grid gap-2.5 sm:ps-12">
                  {day.blocks.map((b, i) => {
                    const error = errors[weekday]?.[i] ?? null;
                    const errId = `hours-${weekday}-${i}-error`;
                    return (
                      <div key={i} className="grid gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:max-w-72">
                            <Input
                              type="time"
                              aria-label={`${name}: ${t("appt.from")}`}
                              value={b.start}
                              onChange={(e) => updateBlock(weekday, i, { start: e.target.value })}
                              aria-invalid={error ? true : undefined}
                              aria-describedby={error ? errId : undefined}
                              className="tabular-nums"
                              required
                            />
                            <span aria-hidden="true" className="text-muted-foreground">
                              –
                            </span>
                            <Input
                              type="time"
                              aria-label={`${name}: ${t("appt.to")}`}
                              value={b.end}
                              onChange={(e) => updateBlock(weekday, i, { end: e.target.value })}
                              aria-invalid={error ? true : undefined}
                              aria-describedby={error ? errId : undefined}
                              className="tabular-nums"
                              required
                            />
                          </div>
                          <div className="flex min-w-0 items-center gap-2 max-sm:w-full">
                            <NativeSelect
                              aria-label={`${name}: ${t("appt.slotLength")}`}
                              value={String(b.slotMinutes)}
                              onChange={(e) =>
                                updateBlock(weekday, i, { slotMinutes: Number(e.target.value) })
                              }
                              className="max-sm:flex-1"
                            >
                              {[...new Set([...SLOT_CHOICES, b.slotMinutes])]
                                .sort((x, y) => x - y)
                                .map((m) => (
                                  <option key={m} value={m}>
                                    {t("appt.minutesEach", { n: fmt.number(m) })}
                                  </option>
                                ))}
                            </NativeSelect>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`${t("vetui.sched.remove")}: ${name}`}
                              onClick={() => removeBlock(weekday, i)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                        {error ? (
                          <p id={errId} className="text-xs font-medium text-destructive">
                            {t(error, { n: fmt.number(b.slotMinutes) })}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addBlock(weekday)}
                    className="justify-self-start"
                  >
                    <Plus aria-hidden="true" />
                    {t("appt.addHours")}
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 md:bottom-4">
        <div className="flex flex-wrap items-center gap-3 rounded-(--radius-2xl) bg-card/95 p-3 shadow-(--shadow-card-hover) ring-1 ring-foreground/8 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-4">
          <div className="grid min-w-0 flex-1 basis-48 gap-0.5 text-sm" aria-live="polite">
            <p className="font-medium">
              {openDays > 0
                ? t("vetui.sched.summary", { days: fmt.number(openDays), slots: fmt.number(slots) })
                : t("vetui.sched.summaryClosed")}
            </p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                aria-hidden="true"
                className={cn("size-2 shrink-0 rounded-full", dirty ? "bg-warning" : "bg-success")}
              />
              {dirty ? t("vetui.save.unsaved") : t("vetui.save.saved")}
            </p>
          </div>
          <Button type="submit" variant="brand" size="lg" disabled={pending} className="max-sm:w-full">
            {pending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
