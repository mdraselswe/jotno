"use client";

import { Plus } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HealthKind } from "@/features/health";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { HEALTH_KINDS } from "../kinds";
import { addHealthRecord } from "../server/actions";

const KINDS = Object.keys(HEALTH_KINDS) as HealthKind[];

/** Add a vaccine / deworming / check-up. Due date defaults from the kind when left empty. */
export function HealthRecordForm({ petId, today }: { petId: string; today: string }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<HealthKind>("vaccine");
  const [title, setTitle] = useState("");
  const [givenOn, setGivenOn] = useState(today);
  const [dueOn, setDueOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open)
    return (
      <Button type="button" variant="brand" onClick={() => setOpen(true)} className="w-fit max-sm:w-full">
        <Plus aria-hidden="true" />
        {t("health.add")}
      </Button>
    );

  function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    // The server checks again; these catch the common slips before a round trip.
    if (!givenOn || givenOn > today || (dueOn && dueOn < givenOn)) {
      setError(t("health.invalid"));
      return;
    }
    setError(null);
    start(async () => {
      const result = await addHealthRecord(locale, petId, {
        kind,
        title: title.trim() || t(HEALTH_KINDS[kind].label),
        givenOn,
        dueOn: dueOn || null,
      });
      if (!result.ok) {
        setError(t(result.error));
        return;
      }
      toast.success(t("common.saved"));
      setOpen(false);
      setTitle("");
      setDueOn("");
      setGivenOn(today);
    });
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby="hr-form-title"
      className="grid gap-4 rounded-(--radius-xl) bg-muted/50 p-4 ring-1 ring-foreground/6"
    >
      <p id="hr-form-title" className="font-heading font-semibold">
        {t("ownerui.health.formTitle")}
      </p>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">{t("health.kind")}</legend>
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => {
            const Icon = HEALTH_KINDS[k].icon;
            return (
              <label
                key={k}
                className={cn(
                  "grid cursor-pointer justify-items-center gap-1.5 rounded-(--radius-lg) bg-card px-2 py-3 text-center text-sm font-medium shadow-(--shadow-control) ring-1 ring-foreground/8 transition-[background-color,box-shadow] duration-(--motion-fast) has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  kind === k && "bg-primary/8 text-primary ring-2 ring-primary",
                )}
              >
                <input
                  type="radio"
                  name="hr-kind"
                  value={k}
                  className="sr-only"
                  checked={kind === k}
                  onChange={() => setKind(k)}
                />
                <Icon aria-hidden="true" className="size-5" />
                {t(HEALTH_KINDS[k].label)}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="hr-title">{t("health.title")}</Label>
        <Input
          id="hr-title"
          maxLength={80}
          value={title}
          placeholder={t("health.titleHint")}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="hr-given">{t("health.givenOn")}</Label>
          <Input
            id="hr-given"
            type="date"
            max={today}
            required
            value={givenOn}
            onChange={(e) => setGivenOn(e.target.value)}
            aria-invalid={error && (!givenOn || givenOn > today) ? true : undefined}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="hr-due">
            {t("health.dueOn")} <span className="text-muted-foreground">({t("common.optional")})</span>
          </Label>
          <Input
            id="hr-due"
            type="date"
            min={givenOn}
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
            aria-describedby="hr-due-hint"
            aria-invalid={error && dueOn && dueOn < givenOn ? true : undefined}
          />
        </div>
      </div>
      <p id="hr-due-hint" className="text-xs text-muted-foreground">
        {t("health.dueHint")}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="brand" disabled={pending} className="max-sm:flex-1">
          {pending ? t("common.saving") : t("common.save")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
