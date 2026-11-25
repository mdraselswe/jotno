"use client";

import { ArrowLeft, ArrowRight, Check, MapPin, PawPrint, Stethoscope, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Spot } from "@/components/illustrations/spots";
import { AreaPicker } from "@/components/forms/area-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { isBdMobile } from "../phone";
import { completeOnboarding } from "../server/actions";

type Role = "owner" | "vet";
const STEPS = [
  { key: "ownerui.onb.stepRole", icon: UserRound },
  { key: "ownerui.onb.stepName", icon: PawPrint },
  { key: "ownerui.onb.stepPlace", icon: MapPin },
] as const;

/** Three short steps (who, name + phone, area) in one form; the server checks everything again. */
export function OnboardingForm({ defaultName, defaultRole }: { defaultName: string; defaultRole?: Role }) {
  const t = useT();
  const fmt = useFormatter();
  const locale = useLocale();
  const next = useSearchParams().get("next");
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>(defaultRole ?? "owner");
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [place, setPlace] = useState<{ districtId: number | null; areaId: number | null }>({
    districtId: null,
    areaId: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const last = STEPS.length - 1;

  const nameOk = name.trim().length >= 2;
  const phoneOk = phone.trim() === "" || isBdMobile(phone);

  function go(to: number) {
    setError(null);
    setStep(to);
    // Move focus to the new step's title so screen readers hear where they are.
    requestAnimationFrame(() => heading.current?.focus());
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (step === 1 && !nameOk) {
      setError(t("onboarding.nameInvalid"));
      return;
    }
    if (step === 1 && !phoneOk) {
      setError(t("common.phoneInvalid"));
      return;
    }
    // Enter on an early step moves on instead of finishing.
    if (step < last) {
      go(step + 1);
      return;
    }
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
      if (result && !result.ok) {
        // Name and phone live on step 2: take the person back there.
        if (result.error === "common.phoneInvalid" || result.error === "onboarding.nameInvalid") setStep(1);
        setError(t(result.error));
      }
    });
  }

  const choice = (value: Role, icon: ReactNode, title: string, hint: string) => (
    <label
      className={cn(
        "relative flex min-h-24 cursor-pointer items-center gap-4 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-control) ring-1 ring-foreground/10 transition-[background-color,box-shadow] duration-(--motion-fast) has-focus-visible:ring-3 has-focus-visible:ring-ring/50 sm:p-5",
        role === value ? "bg-primary/6 ring-2 ring-primary" : "hover:bg-muted/50",
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
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-(--radius-xl)",
          role === value ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        {icon}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="font-heading text-lg font-semibold">{title}</span>
        <span className="text-sm text-pretty text-muted-foreground">{hint}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full ring-2 transition-colors duration-(--motion-fast)",
          role === value ? "bg-primary text-primary-foreground ring-primary" : "ring-foreground/20",
        )}
      >
        {role === value ? <Check className="size-3.5" /> : null}
      </span>
    </label>
  );

  const Current = STEPS[step] ?? STEPS[0];

  return (
    <form
      onSubmit={submit}
      className="mx-auto grid w-full max-w-lg gap-6 rounded-(--radius-3xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-8"
      noValidate
    >
      <div className="grid justify-items-center gap-2 text-center">
        <Spot name="welcome" className="w-24 sm:w-28" />
        <p className="font-heading text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          {t("onboarding.title")}
        </p>
        <p className="text-sm text-pretty text-muted-foreground">{t("onboarding.sub")}</p>
      </div>

      {/* Progress */}
      <div className="grid gap-2">
        <p className="text-xs font-semibold text-primary" aria-live="polite">
          {t("onboarding.step", { n: fmt.number(step + 1), total: fmt.number(STEPS.length) })}
        </p>
        <ol className="grid grid-cols-3 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.key} className="grid gap-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 rounded-full transition-colors duration-(--motion-base)",
                  i <= step ? "bg-primary" : "bg-muted",
                )}
              />
              <span
                className={cn(
                  "truncate text-xs",
                  i === step ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
                aria-current={i === step ? "step" : undefined}
              >
                {t(s.key)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <h1
        ref={heading}
        tabIndex={-1}
        className="flex items-center gap-2.5 font-heading text-xl font-semibold outline-none"
      >
        <Current.icon aria-hidden="true" className="size-5 text-primary" />
        {step === 0 ? t("onboarding.who") : step === 1 ? t(Current.key) : t("onboarding.where")}
      </h1>

      <fieldset className={cn("grid gap-3", step !== 0 && "hidden")}>
        <legend className="sr-only">{t("onboarding.who")}</legend>
        {choice(
          "owner",
          <PawPrint aria-hidden="true" className="size-6" />,
          t("onboarding.owner"),
          t("onboarding.ownerHint"),
        )}
        {choice(
          "vet",
          <Stethoscope aria-hidden="true" className="size-6" />,
          t("onboarding.vet"),
          t("onboarding.vetHint"),
        )}
      </fieldset>

      <div className={cn("grid gap-5", step !== 1 && "hidden")}>
        <div className="grid gap-2">
          <Label htmlFor="onb-name">{t("onboarding.name")}</Label>
          <Input
            id="onb-name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-(--control-h-lg)"
            aria-describedby="onb-name-hint"
            aria-invalid={error && !nameOk ? true : undefined}
          />
          <p id="onb-name-hint" className="text-xs text-muted-foreground">
            {t("ownerui.onb.nameHint")}
          </p>
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
            className="h-(--control-h-lg)"
            aria-describedby="onb-phone-hint"
            aria-invalid={error && !phoneOk ? true : undefined}
          />
          <p id="onb-phone-hint" className="text-xs text-muted-foreground">
            {t("common.phoneHint")}
          </p>
        </div>
      </div>

      <fieldset className={cn("grid gap-3", step !== 2 && "hidden")}>
        <legend className="sr-only">{t("onboarding.where")}</legend>
        <p className="text-sm text-muted-foreground">
          {t("onboarding.whereHint")} {t("ownerui.onb.placeSkip")}
        </p>
        <AreaPicker idPrefix="onb" districtId={place.districtId} areaId={place.areaId} onChange={setPlace} />
      </fieldset>

      {error ? (
        <p role="alert" className="rounded-(--radius-lg) bg-destructive/8 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        {step > 0 ? (
          <Button type="button" variant="outline" size="lg" onClick={() => go(step - 1)} disabled={pending}>
            <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
            {t("common.back")}
          </Button>
        ) : null}
        <Button type="submit" variant="brand" size="lg" disabled={pending} className="flex-1">
          {step < last ? (
            <>
              {t("common.next")}
              <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
            </>
          ) : pending ? (
            t("common.saving")
          ) : (
            <>
              <Check aria-hidden="true" />
              {t("onboarding.done")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
