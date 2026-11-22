"use client";

import { CalendarCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { bookAppointment } from "../server/actions";

/** Owner: pick a day and time, the pet, a reason; pay the booking fee. */
export function SlotPicker({
  providerId,
  days,
  pets,
  feeLabel,
}: {
  providerId: string;
  days: { day: string; slots: string[] }[];
  pets: { id: string; name: string }[];
  feeLabel: string;
}) {
  const t = useT();
  const locale = useLocale();
  const fmt = useFormatter();
  const [day, setDay] = useState(days[0]?.day ?? "");
  const [slot, setSlot] = useState<string | null>(null);
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const current = days.find((d) => d.day === day);
  const dayLabel = (d: string) =>
    fmt.date(new Date(`${d}T00:00:00+06:00`), {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Asia/Dhaka",
    });
  const timeLabel = (iso: string) =>
    fmt.date(new Date(iso), { hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" });

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!slot) return;
        setError(null);
        start(async () => {
          const res = await bookAppointment(locale, providerId, {
            start: slot,
            patientId: petId || null,
            reason,
          });
          if (!res.ok) setError(t(res.error));
        });
      }}
    >
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">{t("appt.pickDay")}</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => (
            <button
              key={d.day}
              type="button"
              aria-pressed={d.day === day}
              onClick={() => {
                setDay(d.day);
                setSlot(null);
              }}
              className={cn(
                "shrink-0 rounded-(--control-radius) bg-card px-3 py-2 text-sm shadow-(--shadow-control) transition-colors",
                d.day === day
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted",
              )}
            >
              {dayLabel(d.day)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">{t("appt.pickTime")}</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {current?.slots.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === slot}
              onClick={() => setSlot(s)}
              className={cn(
                "rounded-(--control-radius) bg-card px-2 py-2 text-sm tabular-nums shadow-(--shadow-control) transition-colors",
                s === slot ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {timeLabel(s)}
            </button>
          ))}
        </div>
      </fieldset>

      {pets.length > 0 ? (
        <div className="grid gap-1">
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

      <div className="grid gap-1">
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

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending || !slot}>
        <CalendarCheck aria-hidden="true" />
        {pending ? t("pay.redirecting") : t("appt.payBook", { fee: feeLabel })}
      </Button>
    </form>
  );
}
