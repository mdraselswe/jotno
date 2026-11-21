"use client";

import { Plus } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useLocale, useT } from "@/i18n/client";
import { addHealthRecord } from "../server/actions";

type Kind = "vaccine" | "deworm" | "checkup";
const KIND_KEYS = { vaccine: "health.vaccine", deworm: "health.deworm", checkup: "health.checkup" } as const;

/** Add a vaccine / deworming / check-up. Due date defaults from the kind when left empty. */
export function HealthRecordForm({ petId, today }: { petId: string; today: string }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("vaccine");
  const [title, setTitle] = useState("");
  const [givenOn, setGivenOn] = useState(today);
  const [dueOn, setDueOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open)
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        {t("health.add")}
      </Button>
    );

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await addHealthRecord(locale, petId, {
        kind,
        title: title || t(KIND_KEYS[kind]),
        givenOn,
        dueOn: dueOn || null,
      });
      if (!result.ok) {
        setError(t(result.error));
        return;
      }
      setOpen(false);
      setTitle("");
      setDueOn("");
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad)"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="hr-kind">{t("health.kind")}</Label>
          <NativeSelect id="hr-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            {(Object.keys(KIND_KEYS) as Kind[]).map((k) => (
              <option key={k} value={k}>
                {t(KIND_KEYS[k])}
              </option>
            ))}
          </NativeSelect>
        </div>
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
        <div className="grid gap-2">
          <Label htmlFor="hr-given">{t("health.givenOn")}</Label>
          <Input
            id="hr-given"
            type="date"
            max={today}
            required
            value={givenOn}
            onChange={(e) => setGivenOn(e.target.value)}
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
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("health.dueHint")}</p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : t("common.save")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
