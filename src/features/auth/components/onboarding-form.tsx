"use client";

import { PawPrint, Stethoscope } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Mishu } from "@/components/brand/mishu";
import { AreaPicker } from "@/components/forms/area-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "../server/actions";

type Role = "owner" | "vet";

export function OnboardingForm({ defaultName, defaultRole }: { defaultName: string; defaultRole?: Role }) {
  const t = useT();
  const locale = useLocale();
  const next = useSearchParams().get("next");
  const [role, setRole] = useState<Role>(defaultRole ?? "owner");
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [place, setPlace] = useState<{ districtId: number | null; areaId: number | null }>({
    districtId: null,
    areaId: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await completeOnboarding(
        locale,
        {
          role,
          fullName: name,
          phone,
          districtId: place.districtId ?? undefined,
          areaId: place.areaId ?? undefined,
        },
        next,
      );
      // Success redirects on the server.
      if (result && !result.ok) setError(t(result.error));
    });
  }

  const choice = (value: Role, icon: ReactNode, title: string, hint: string) => (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-(--control-radius) bg-card p-4 shadow-(--shadow-control) transition-[border-color,background-color] duration-(--motion-fast) has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        role === value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
      )}
    >
      <input
        type="radio"
        name="role"
        value={value}
        checked={role === value}
        onChange={() => setRole(value)}
        className="sr-only"
      />
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="grid gap-0.5">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </span>
    </label>
  );

  return (
    <form onSubmit={submit} className="mx-auto grid w-full max-w-lg gap-8" noValidate>
      <div className="grid justify-items-center gap-3 text-center">
        <Mishu mood={error ? "worried" : pending ? "listening" : "happy"} className="size-24" />
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{t("onboarding.title")}</h1>
        <p className="text-pretty text-muted-foreground">{t("onboarding.sub")}</p>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-3 font-medium">{t("onboarding.who")}</legend>
        {choice(
          "owner",
          <PawPrint aria-hidden="true" className="size-5" />,
          t("onboarding.owner"),
          t("onboarding.ownerHint"),
        )}
        {choice(
          "vet",
          <Stethoscope aria-hidden="true" className="size-5" />,
          t("onboarding.vet"),
          t("onboarding.vetHint"),
        )}
      </fieldset>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="onb-name">{t("onboarding.name")}</Label>
          <Input
            id="onb-name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="onb-phone">
            {t("common.phone")} <span className="text-muted-foreground">({t("common.optional")})</span>
          </Label>
          <Input
            id="onb-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="017XXXXXXXX"
            aria-describedby="onb-phone-hint"
          />
          <p id="onb-phone-hint" className="text-xs text-muted-foreground">
            {t("common.phoneHint")}
          </p>
        </div>
      </div>

      <fieldset className="grid gap-3">
        <legend className="font-medium">{t("onboarding.where")}</legend>
        <p className="-mt-1 text-sm text-muted-foreground">{t("onboarding.whereHint")}</p>
        <AreaPicker idPrefix="onb" districtId={place.districtId} areaId={place.areaId} onChange={setPlace} />
      </fieldset>

      {error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending || name.trim().length < 2}>
        {pending ? t("common.saving") : t("onboarding.done")}
      </Button>
    </form>
  );
}
