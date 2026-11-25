"use client";

import { CalendarCheck, Link2, Loader2, Pill, Plus, Send, Stethoscope, Trash2, X } from "lucide-react";
import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { MessageKey } from "@/i18n";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  emptyRxItem,
  RX_MAX_ITEMS,
  rxErrors,
  withoutBlankRows,
  type RxErrors,
  type RxInput,
  type RxItemInput,
} from "../../prescription";
import { savePrescription, searchRxProducts } from "../../server/rx-actions";

type Suggestion = Awaited<ReturnType<typeof searchRxProducts>>[number];

const FREQUENCIES = ["rx.freq.once", "rx.freq.twice", "rx.freq.thrice", "rx.freq.asNeeded"] as const;
const TIMING = ["rx.when.after", "rx.when.before"] as const;
const COURSE_DAYS = [3, 5, 7, 10, 14] as const;
const FOLLOW_UP_DAYS = [3, 7, 14, 30] as const;

/** Shop products matching what the vet types, to link a medicine line to the shop. */
function ProductSuggestions({ query, onPick }: { query: string; onPick: (s: Suggestion) => void }) {
  const t = useT();
  const fmt = useFormatter();
  const locale = useLocale();
  const [list, setList] = useState<Suggestion[]>([]);
  useEffect(() => {
    let alive = true;
    const term = query.trim();
    const id = window.setTimeout(
      () => {
        if (term.length < 2) {
          setList([]);
          return;
        }
        void searchRxProducts(term).then((r) => {
          if (alive) setList(r);
        });
      },
      term.length < 2 ? 0 : 300,
    );
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [query]);
  if (list.length === 0) return null;
  return (
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground">{t("rx.suggestions")}</span>
      <ul className="flex flex-wrap gap-1.5">
        {list.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="rounded-full bg-muted px-2.5 py-1 text-xs hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {locale === "bn" ? s.nameBn : s.nameEn}
              {s.unit ? ` · ${s.unit}` : ""} · {taka(fmt, s.price)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A row of quick answers; the one matching the field's value is filled. */
function Chips({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: readonly { key: string; text: string }[];
  value: string;
  onPick: (text: string) => void;
}) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.trim() === o.text;
        return (
          <li key={o.key}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onPick(on ? "" : o.text)}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-medium ring-1 transition-colors duration-(--motion-fast) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                on
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card text-foreground/80 ring-foreground/12 hover:bg-muted hover:text-foreground",
              )}
            >
              {o.text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** A numbered part of the form, as a card. */
function Section({
  n,
  icon: Icon,
  title,
  hint,
  children,
}: {
  n: number;
  icon: typeof Pill;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  const fmt = useFormatter();
  return (
    <section className="grid gap-3 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6">
      <header className="flex items-start gap-3">
        <span className="relative grid size-9 shrink-0 place-items-center rounded-(--radius-md) bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-4.5" />
          <span className="absolute -end-1.5 -top-1.5 grid size-4.5 place-items-center rounded-full bg-primary text-[0.625rem] font-bold text-primary-foreground tabular-nums">
            {fmt.number(n)}
          </span>
        </span>
        <div className="grid gap-0.5">
          <h3 className="font-heading text-base font-semibold">{title}</h3>
          <p className="text-xs text-pretty text-muted-foreground">{hint}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function FieldError({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} className="text-xs font-medium text-destructive">
      {text}
    </p>
  );
}

/** Vet: write or change the consult's prescription (a side sheet next to the chat). */
export function RxEditor({
  consultId,
  initial,
  linkedNames,
  patient,
  open: openProp,
  onOpenChange,
}: {
  consultId: string;
  initial: RxInput | null;
  /** Shop product names for lines already linked (id → name). */
  linkedNames: Record<string, string>;
  /** Who it is for, shown at the top so the vet writes for the right pet. */
  patient?: { pet: string | null; owner: string; complaint: string };
  /** Controlled from outside (the chat menu): no trigger button is drawn then. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const fmt = useFormatter();
  const locale = useLocale();
  const [ownOpen, setOwnOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : ownOpen;
  const setOpen = (next: boolean) => {
    if (!controlled) setOwnOpen(next);
    onOpenChange?.(next);
  };
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? "");
  const [items, setItems] = useState<RxItemInput[]>(initial?.items.length ? initial.items : [emptyRxItem()]);
  const [advice, setAdvice] = useState(initial?.advice ?? "");
  const [followUp, setFollowUp] = useState(initial?.followUpDays ? String(initial.followUpDays) : "");
  const [names, setNames] = useState(linkedNames);
  // Shown after the first try to save, then kept up to date while typing.
  const [tried, setTried] = useState(false);
  const [pending, start] = useTransition();

  const errors: RxErrors | null = tried ? rxErrors({ diagnosis, items }) : null;
  const filled = withoutBlankRows(items).length;
  const followDays = Number.parseInt(followUp, 10);
  const hasFollow = Number.isFinite(followDays) && followDays > 0;

  const update = (i: number, patch: Partial<RxItemInput>) =>
    setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const options = (keys: readonly MessageKey[]) => keys.map((key) => ({ key, text: t(key) }));

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (rxErrors({ diagnosis, items })) {
      toast.error(t("rx.fixErrors"));
      return;
    }
    start(async () => {
      const r = await savePrescription(locale, consultId, {
        diagnosis,
        items: items.map((it) => ({ ...it, note: it.note ?? "" })),
        advice,
        followUpDays: hasFollow ? followDays : null,
      });
      if (!r.ok) {
        toast.error(t(r.error));
        return;
      }
      toast.success(t("rx.saved"));
      setOpen(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {controlled ? null : (
        <SheetTrigger
          render={
            <Button size="sm" variant="outline">
              <Pill aria-hidden="true" />
              {t(initial ? "rx.edit" : "rx.write")}
            </Button>
          }
        />
      )}
      <SheetContent side="right" className="w-full gap-0 sm:max-w-xl">
        <SheetHeader className="flex-row items-start gap-3 border-b pe-12">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-primary font-serif text-xl font-bold text-primary-foreground"
          >
            ℞
          </span>
          <div className="grid gap-0.5">
            <SheetTitle className="font-heading text-lg font-bold">
              {t(initial ? "rx.edit" : "rx.write")}
            </SheetTitle>
            <SheetDescription>{t("rx.formSub")}</SheetDescription>
          </div>
        </SheetHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="grid flex-1 content-start gap-4 overflow-y-auto overscroll-contain bg-muted/30 p-4">
            {patient ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-(--radius-xl) bg-card p-3.5 text-sm ring-1 ring-foreground/6">
                <div className="grid min-w-0 gap-0.5">
                  <dt className="text-xs text-muted-foreground">{t("rx.patient")}</dt>
                  <dd className="truncate font-semibold">{patient.pet ?? "—"}</dd>
                </div>
                <div className="grid min-w-0 gap-0.5">
                  <dt className="text-xs text-muted-foreground">{t("rx.owner")}</dt>
                  <dd className="truncate font-semibold">{patient.owner}</dd>
                </div>
                <div className="col-span-2 grid min-w-0 gap-0.5">
                  <dt className="text-xs text-muted-foreground">{t("rx.complaint")}</dt>
                  <dd className="line-clamp-2 text-pretty">{patient.complaint}</dd>
                </div>
              </dl>
            ) : null}

            <Section n={1} icon={Stethoscope} title={t("rx.diagnosis")} hint={t("rx.diagnosisHint")}>
              <Label htmlFor="rx-diagnosis" className="sr-only">
                {t("rx.diagnosis")}
              </Label>
              <Textarea
                id="rx-diagnosis"
                rows={3}
                maxLength={1000}
                placeholder={t("rx.diagnosisPh")}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                aria-invalid={errors?.diagnosis || undefined}
                aria-describedby={errors?.diagnosis ? "rx-diagnosis-err" : undefined}
                required
              />
              {errors?.diagnosis ? <FieldError id="rx-diagnosis-err" text={t("rx.err.diagnosis")} /> : null}
            </Section>

            <Section n={2} icon={Pill} title={t("rx.medicines")} hint={t("rx.medicinesHint")}>
              <ol className="grid gap-3">
                {items.map((it, i) => {
                  const n = i + 1;
                  const id = `rx-${i}`;
                  const bad = errors?.items[i] ?? [];
                  const err = (f: "name" | "dose" | "frequency") => bad.includes(f);
                  return (
                    <li
                      key={i}
                      className="grid gap-3 rounded-(--radius-xl) bg-muted/40 p-3 ring-1 ring-foreground/6"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold">
                          <span className="grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground tabular-nums">
                            {fmt.number(n)}
                          </span>
                          {t("rx.medicine", { n: fmt.number(n) })}
                        </span>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={t("rx.removeMedicine", { n: fmt.number(n) })}
                          onClick={() =>
                            setItems((list) =>
                              list.length > 1 ? list.filter((_, j) => j !== i) : [emptyRxItem()],
                            )
                          }
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor={`${id}-name`} className="text-xs font-semibold">
                          {t("rx.name")}
                        </Label>
                        <Input
                          id={`${id}-name`}
                          maxLength={120}
                          value={it.name}
                          onChange={(e) => update(i, { name: e.target.value })}
                          aria-invalid={err("name") || undefined}
                          aria-describedby={err("name") ? `${id}-name-err` : undefined}
                        />
                        {err("name") ? <FieldError id={`${id}-name-err`} text={t("rx.err.name")} /> : null}
                        {it.productId ? (
                          <span className="flex w-fit items-center gap-1.5 rounded-full bg-primary/10 py-0.5 ps-2.5 pe-1 text-xs text-primary">
                            <Link2 aria-hidden="true" className="size-3.5" />
                            {t("rx.linked", { name: names[it.productId] ?? it.name })}
                            <button
                              type="button"
                              className="grid size-5 place-items-center rounded-full text-primary/80 hover:bg-primary/15 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                              aria-label={t("rx.unlink")}
                              onClick={() => update(i, { productId: null })}
                            >
                              <X aria-hidden="true" className="size-3.5" />
                            </button>
                          </span>
                        ) : (
                          <ProductSuggestions
                            query={it.name}
                            onPick={(s) => {
                              const name = locale === "bn" ? s.nameBn : s.nameEn;
                              setNames((m) => ({ ...m, [s.id]: name }));
                              update(i, { productId: s.id, name: s.unit ? `${name} (${s.unit})` : name });
                            }}
                          />
                        )}
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor={`${id}-dose`} className="text-xs font-semibold">
                          {t("rx.dose")}
                        </Label>
                        <Input
                          id={`${id}-dose`}
                          placeholder={t("rx.dosePh")}
                          maxLength={80}
                          value={it.dose}
                          onChange={(e) => update(i, { dose: e.target.value })}
                          aria-invalid={err("dose") || undefined}
                          aria-describedby={err("dose") ? `${id}-dose-err` : undefined}
                        />
                        {err("dose") ? <FieldError id={`${id}-dose-err`} text={t("rx.err.dose")} /> : null}
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor={`${id}-freq`} className="text-xs font-semibold">
                          {t("rx.frequency")}
                        </Label>
                        <Chips
                          label={t("rx.frequency")}
                          options={options(FREQUENCIES)}
                          value={it.frequency}
                          onPick={(text) => update(i, { frequency: text })}
                        />
                        <Input
                          id={`${id}-freq`}
                          placeholder={t("rx.frequencyPh")}
                          maxLength={120}
                          value={it.frequency}
                          onChange={(e) => update(i, { frequency: e.target.value })}
                          aria-invalid={err("frequency") || undefined}
                          aria-describedby={err("frequency") ? `${id}-freq-err` : undefined}
                        />
                        {err("frequency") ? (
                          <FieldError id={`${id}-freq-err`} text={t("rx.err.frequency")} />
                        ) : null}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid content-start gap-1.5">
                          <Label htmlFor={`${id}-days`} className="text-xs font-semibold">
                            {t("rx.days")}
                          </Label>
                          <Chips
                            label={t("rx.days")}
                            options={COURSE_DAYS.map((d) => ({
                              key: String(d),
                              text: t("rx.daysN", { n: fmt.number(d) }),
                            }))}
                            value={it.days ? t("rx.daysN", { n: fmt.number(it.days) }) : ""}
                            onPick={(text) => {
                              const d = COURSE_DAYS.find((x) => t("rx.daysN", { n: fmt.number(x) }) === text);
                              update(i, { days: d ?? null });
                            }}
                          />
                          <Input
                            id={`${id}-days`}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={365}
                            className="max-w-28"
                            value={it.days ?? ""}
                            onChange={(e) => {
                              const v = Number.parseInt(e.target.value, 10);
                              update(i, { days: Number.isFinite(v) && v > 0 ? v : null });
                            }}
                          />
                        </div>
                        <div className="grid content-start gap-1.5">
                          <Label htmlFor={`${id}-note`} className="text-xs font-semibold">
                            {t("rx.note")}
                          </Label>
                          <Chips
                            label={t("rx.note")}
                            options={options(TIMING)}
                            value={it.note ?? ""}
                            onPick={(text) => update(i, { note: text })}
                          />
                          <Input
                            id={`${id}-note`}
                            maxLength={200}
                            value={it.note ?? ""}
                            onChange={(e) => update(i, { note: e.target.value })}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              {items.length < RX_MAX_ITEMS ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setItems((list) => [...list, emptyRxItem()])}
                >
                  <Plus aria-hidden="true" />
                  {t("rx.addMedicine")}
                </Button>
              ) : null}
            </Section>

            <Section n={3} icon={CalendarCheck} title={t("rx.adviceSection")} hint={t("rx.adviceHint")}>
              <div className="grid gap-1.5">
                <Label htmlFor="rx-advice" className="text-xs font-semibold">
                  {t("rx.advice")}
                </Label>
                <Textarea
                  id="rx-advice"
                  rows={4}
                  maxLength={2000}
                  placeholder={t("rx.advicePh")}
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rx-follow" className="text-xs font-semibold">
                  {t("rx.followUp")}
                </Label>
                <Chips
                  label={t("rx.followUp")}
                  options={[
                    { key: "none", text: t("rx.followUpNone") },
                    ...FOLLOW_UP_DAYS.map((d) => ({
                      key: String(d),
                      text: t("rx.daysN", { n: fmt.number(d) }),
                    })),
                  ]}
                  value={hasFollow ? t("rx.daysN", { n: fmt.number(followDays) }) : t("rx.followUpNone")}
                  onPick={(text) => {
                    const d = FOLLOW_UP_DAYS.find((x) => t("rx.daysN", { n: fmt.number(x) }) === text);
                    setFollowUp(d ? String(d) : "");
                  }}
                />
                <div className="flex items-center gap-2">
                  <Input
                    id="rx-follow"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={180}
                    className="max-w-28"
                    placeholder={t("rx.followUpCustom")}
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                  />
                </div>
              </div>
            </Section>
          </div>
          <div className="grid gap-2 border-t bg-popover p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <p className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {filled > 0 ? t("rx.summaryMeds", { n: fmt.number(filled) }) : t("rx.summaryNoMeds")}
              </span>
              {hasFollow ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarCheck aria-hidden="true" className="size-3.5" />
                  {t("rx.daysN", { n: fmt.number(followDays) })}
                </span>
              ) : null}
            </p>
            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="w-full"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Send aria-hidden="true" />
              )}
              {t("rx.save")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
