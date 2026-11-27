"use client";

import { CalendarCheck, Clock, MapPin, Moon, Sun, Sunrise, Wallet, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { MessageKey } from "@/i18n";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { dhakaMinute } from "@/lib/dhaka";
import { cn } from "@/lib/utils";
import { bookAppointment } from "../server/actions";

const PERIODS: { key: MessageKey; icon: LucideIcon; until: number }[] = [
  { key: "ownerui.book.morning", icon: Sunrise, until: 12 * 60 },
  { key: "ownerui.book.afternoon", icon: Sun, until: 17 * 60 },
  { key: "ownerui.book.evening", icon: Moon, until: 24 * 60 },
];

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5">
      <legend className="contents">
        <span className="flex items-center gap-2.5 font-heading font-semibold">
          <span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-primary-foreground tabular-nums">
            {n}
          </span>
          {title}
        </span>
      </legend>
      {children}
    </fieldset>
  );
}

/** Owner: pick a day and time, the pet, a reason; pay the booking fee. */
export function SlotPicker({
  providerId,
  days,
  pets,
  feeLabel,
  visitFeeLabel,
  place,
}: {
  providerId: string;
  days: { day: string; slots: string[] }[];
  pets: { id: string; name: string }[];
  feeLabel: string;
  /** Paid at the clinic (shown in the summary). */
  visitFeeLabel?: string;
  /** Clinic and address (shown in the summary). */
  place?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const fmt = useFormatter();
  const router = useRouter();
  const [day, setDay] = useState(days[0]?.day ?? "");
  const [slot, setSlot] = useState<string | null>(null);
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const current = days.find((d) => d.day === day);
  // Days are Dhaka calendar days; the formatter shows them in the site's time zone.
  const asDate = (d: string) => new Date(`${d}T00:00:00+06:00`);
  const timeLabel = (iso: string) => fmt.date(new Date(iso), { hour: "numeric", minute: "2-digit" });
  const when = slot
    ? `${fmt.date(new Date(slot), { weekday: "short", day: "numeric", month: "short" })} · ${timeLabel(slot)}`
    : null;

  const groups = PERIODS.map((p, i) => {
    const from = i === 0 ? 0 : (PERIODS[i - 1]?.until ?? 0);
    return {
      ...p,
      slots: (current?.slots ?? []).filter((s) => {
        const m = dhakaMinute(new Date(s));
        return m >= from && m < p.until;
      }),
    };
  }).filter((g) => g.slots.length > 0);

  const submitLabel = pending ? t("pay.redirecting") : t("appt.payBook", { fee: feeLabel });
  const errorLine = error ? (
    <p role="alert" className="rounded-(--radius-lg) bg-destructive/8 px-3 py-2 text-sm text-destructive">
      {error}
    </p>
  ) : null;

  return (
    <form
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!slot || pending) return;
        setError(null);
        start(async () => {
          // Success sends the browser to the payment page.
          const res = await bookAppointment(locale, providerId, {
            start: slot,
            patientId: petId || null,
            reason,
          });
          if (!res.ok) {
            setError(t(res.error));
            if (res.error === "appt.slotGone") {
              // Someone else took it: drop the choice and fetch fresh times.
              setSlot(null);
              router.refresh();
            }
          }
        });
      }}
    >
      <div className="grid min-w-0 gap-5">
        <Step n={1} title={t("ownerui.book.stepDay")}>
          <div className="-mx-4 flex snap-x scroll-px-4 [scrollbar-width:thin] gap-2 overflow-x-auto px-4 pt-1 pb-2 sm:-mx-5 sm:scroll-px-5 sm:px-5">
            {days.map((d) => {
              const on = d.day === day;
              const date = asDate(d.day);
              return (
                <button
                  key={d.day}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setDay(d.day);
                    setSlot(null);
                  }}
                  className={cn(
                    "grid w-18 shrink-0 snap-start justify-items-center gap-0.5 rounded-(--radius-xl) py-2.5 ring-1 transition-[background-color,color,box-shadow] duration-(--motion-fast) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    on
                      ? "bg-primary text-primary-foreground shadow-(--shadow-primary) ring-primary"
                      : "bg-card ring-foreground/10 hover:bg-muted",
                  )}
                >
                  <span className="text-xs font-medium">{fmt.date(date, { weekday: "short" })}</span>
                  <span className="font-heading text-xl leading-none font-bold tabular-nums">
                    {fmt.date(date, { day: "numeric" })}
                  </span>
                  <span className="text-[0.6875rem]">{fmt.date(date, { month: "short" })}</span>
                  <span
                    className={cn(
                      "mt-1 text-[0.6875rem] font-semibold",
                      on ? "text-primary-foreground/85" : "text-success",
                    )}
                  >
                    {t("ownerui.book.free", { n: fmt.number(d.slots.length) })}
                  </span>
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={2} title={t("ownerui.book.stepTime")}>
          <div className="grid gap-4">
            {groups.map((g) => {
              const Icon = g.icon;
              return (
                <div key={g.key} className="grid gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Icon aria-hidden="true" className="size-4" />
                    {t(g.key)}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {g.slots.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={s === slot}
                        onClick={() => {
                          setSlot(s);
                          setError(null);
                        }}
                        className={cn(
                          "h-11 rounded-(--control-radius) text-sm font-semibold tabular-nums ring-1 transition-[background-color,color,box-shadow] duration-(--motion-fast) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                          s === slot
                            ? "bg-primary text-primary-foreground shadow-(--shadow-primary) ring-primary"
                            : "bg-card ring-foreground/10 hover:bg-muted",
                        )}
                      >
                        {timeLabel(s)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Step>

        <Step n={3} title={t("ownerui.book.stepDetails")}>
          {pets.length > 0 ? (
            <div className="grid gap-2">
              <Label htmlFor="bk-pet">{t("consult.whichPet")}</Label>
              <NativeSelect id="bk-pet" value={petId} onChange={(e) => setPetId(e.target.value)}>
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="">{t("consult.otherAnimal")}</option>
              </NativeSelect>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="bk-reason">
              {t("appt.reason")} <span className="text-muted-foreground">({t("common.optional")})</span>
            </Label>
            <Textarea
              id="bk-reason"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </Step>
      </div>

      {/* Desktop: summary on the side */}
      <aside className="sticky top-24 grid gap-4 rounded-(--radius-2xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6 max-lg:hidden">
        <p className="font-heading text-lg font-semibold">{t("ownerui.book.summary")}</p>
        <dl className="grid gap-3 text-sm">
          <SummaryLine icon={Clock} label={t("ownerui.book.when")}>
            {when ?? <span className="text-muted-foreground">{t("ownerui.book.noTime")}</span>}
          </SummaryLine>
          {place ? (
            <SummaryLine icon={MapPin} label={t("ownerui.book.where")}>
              {place}
            </SummaryLine>
          ) : null}
          <SummaryLine icon={Wallet} label={t("appt.bookingFee")}>
            {feeLabel} <span className="text-muted-foreground">· {t("ownerui.book.payNow")}</span>
          </SummaryLine>
          {visitFeeLabel ? (
            <SummaryLine icon={Wallet} label={t("appt.visitFee")}>
              {visitFeeLabel} <span className="text-muted-foreground">· {t("ownerui.book.atClinic")}</span>
            </SummaryLine>
          ) : null}
        </dl>
        {errorLine}
        <Button type="submit" variant="brand" size="lg" disabled={pending || !slot}>
          <CalendarCheck aria-hidden="true" />
          {submitLabel}
        </Button>
        <p className="text-xs text-pretty text-muted-foreground">{t("appt.feeNote")}</p>
      </aside>

      {/* Phones and tablets: a confirm bar above the tab bar */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 grid gap-2 rounded-(--radius-2xl) bg-card/95 p-3 shadow-(--shadow-card-hover) ring-1 ring-foreground/8 backdrop-blur md:bottom-4 lg:hidden">
        <p className="flex items-center gap-2 px-1 text-sm" aria-live="polite">
          <Clock aria-hidden="true" className="size-4 shrink-0 text-primary" />
          {when ? (
            <span className="font-semibold">{when}</span>
          ) : (
            <span className="text-muted-foreground">{t("ownerui.book.noTime")}</span>
          )}
        </p>
        {errorLine}
        <Button type="submit" variant="brand" size="lg" disabled={pending || !slot} className="w-full">
          <CalendarCheck aria-hidden="true" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function SummaryLine({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="grid min-w-0 gap-0.5">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-medium break-words">{children}</dd>
      </div>
    </div>
  );
}
