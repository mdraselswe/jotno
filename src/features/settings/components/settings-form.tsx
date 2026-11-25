"use client";

import { Headset, RotateCcw, Save, Truck, Wallet as WalletIcon, Banknote } from "lucide-react";
import { useId, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { SectionCard, StatusBadge } from "@/components/layout/app-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { useFormatter, useT } from "@/i18n/client";
import { taka, toPoisha } from "@/lib/money";
import { cn } from "@/lib/utils";
import { walletFee, walletReady, WALLETS, type Settings, type Wallet } from "../model";
import { saveSettings } from "../server/actions";

/** Poisha → the taka text shown in an input ("60", "60.5"). */
const takaText = (poisha: number) => String(poisha / 100);
type MoneyKey =
  "codMax" | "inside" | "outside" | "freeFrom" | "bkashFlat" | "nagadFlat" | "bkashPct" | "nagadPct";
const moneyOf = (s: Settings): Record<MoneyKey, string> => ({
  codMax: takaText(s.cod.maxOrder),
  inside: takaText(s.delivery.inside),
  outside: takaText(s.delivery.outside),
  freeFrom: takaText(s.delivery.freeFrom),
  bkashFlat: takaText(s.bkash.feeFlat),
  nagadFlat: takaText(s.nagad.feeFlat),
  bkashPct: String(s.bkash.feeBps / 100),
  nagadPct: String(s.nagad.feeBps / 100),
});

/** Largest value each money field takes (poisha; basis points for %), as in the settings schema. */
const MAX: Record<MoneyKey, number> = {
  codMax: 100_000_000,
  inside: 1_000_000,
  outside: 1_000_000,
  freeFrom: 100_000_000,
  bkashFlat: 10_000,
  nagadFlat: 10_000,
  bkashPct: 1_000,
  nagadPct: 1_000,
};
const PHONE = /^(?:01[3-9]\d{8})?$/;
const EXAMPLE = 50_000; // ৳500, for the "the payer adds…" preview

/** One labelled field with help or error text under it. */
function Field({
  id,
  label,
  help,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  help?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid content-start gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-msg`} className="text-xs text-pretty text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** Admin: wallet numbers and charges, cash on delivery, delivery fees, support number. */
export function SettingsForm({ initial }: { initial: Settings }) {
  const t = useT();
  const fmt = useFormatter();
  const uid = useId();
  const [saved, setSaved] = useState(initial);
  const [s, setS] = useState(initial);
  const [money, setMoney] = useState(() => moneyOf(initial));
  const [pending, start] = useTransition();

  // Parse the typed text: poisha (or basis points for %), null when it isn't a valid amount.
  const parsed = Object.fromEntries(
    (Object.keys(money) as MoneyKey[]).map((k) => {
      // Both are "× 100, rounded": taka → poisha, and % → basis points (1.85 → 185).
      const v = toPoisha(money[k]);
      return [k, v !== null && v <= MAX[k] ? v : null];
    }),
  ) as Record<MoneyKey, number | null>;
  const phoneBad = (v: string) => !PHONE.test(v);
  const invalid =
    Object.values(parsed).some((v) => v === null) ||
    WALLETS.some((w) => phoneBad(s[w].number)) ||
    phoneBad(s.supportPhone);

  const next: Settings = {
    ...s,
    bkash: { ...s.bkash, feeBps: parsed.bkashPct ?? -1, feeFlat: parsed.bkashFlat ?? -1 },
    nagad: { ...s.nagad, feeBps: parsed.nagadPct ?? -1, feeFlat: parsed.nagadFlat ?? -1 },
    cod: { ...s.cod, maxOrder: parsed.codMax ?? -1 },
    delivery: {
      inside: parsed.inside ?? -1,
      outside: parsed.outside ?? -1,
      freeFrom: parsed.freeFrom ?? -1,
    },
  };
  const dirty = JSON.stringify(next) !== JSON.stringify(saved);

  const wallet = (w: Wallet, patch: Partial<Settings[Wallet]>) =>
    setS((prev) => ({ ...prev, [w]: { ...prev[w], ...patch } }));
  const setMoneyField = (k: MoneyKey, v: string) => setMoney((m) => ({ ...m, [k]: v }));
  const amountError = (k: MoneyKey) =>
    parsed[k] === null
      ? k.endsWith("Pct")
        ? t("adminui.settings.badPct", { max: fmt.number(MAX[k] / 100) })
        : t("adminui.settings.badAmount", { max: taka(fmt, MAX[k]) })
      : undefined;
  const moneyInput = (k: MoneyKey, id: string, prefix = "৳") => (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
      >
        {prefix}
      </span>
      <Input
        id={id}
        inputMode="decimal"
        value={money[k]}
        aria-invalid={parsed[k] === null || undefined}
        aria-describedby={`${id}-msg`}
        onChange={(e) => setMoneyField(k, e.target.value)}
        className="ps-8 tabular-nums"
      />
    </div>
  );

  function submit() {
    if (invalid) {
      toast.error(t("settingsAdmin.invalid"));
      return;
    }
    start(async () => {
      const r = await saveSettings(next);
      if (r.ok) {
        toast.success(t("common.saved"));
        setSaved(next);
      } else toast.error(t(r.error));
    });
  }

  function reset() {
    setS(saved);
    setMoney(moneyOf(saved));
  }

  return (
    <form
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {WALLETS.map((w) => {
        const id = `${uid}-${w}`;
        const ready = walletReady(s[w]);
        const fee =
          parsed[`${w}Pct`] !== null && parsed[`${w}Flat`] !== null
            ? walletFee(EXAMPLE, { feeBps: parsed[`${w}Pct`] ?? 0, feeFlat: parsed[`${w}Flat`] ?? 0 })
            : null;
        return (
          <SectionCard
            key={w}
            title={t(`pay.method.${w}`)}
            description={t("settingsAdmin.walletSub")}
            icon={WalletIcon}
            actions={
              <StatusBadge tone={ready ? "success" : s[w].enabled ? "warning" : "neutral"}>
                {ready
                  ? t("adminui.settings.live")
                  : s[w].enabled
                    ? t("adminui.settings.needsNumber")
                    : t("adminui.settings.off")}
              </StatusBadge>
            }
            bodyClassName="grid gap-5"
          >
            <div className="flex items-center justify-between gap-4 rounded-(--radius-lg) bg-muted/50 px-3 py-2.5">
              <Label htmlFor={`${id}-on`} className="grid gap-0.5">
                <span>{t("settingsAdmin.acceptHere")}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {t("adminui.settings.acceptHelp")}
                </span>
              </Label>
              <Switch
                id={`${id}-on`}
                checked={s[w].enabled}
                onCheckedChange={(enabled) => wallet(w, { enabled })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id={`${id}-number`}
                label={t("settingsAdmin.number")}
                help={t("adminui.settings.numberHelp")}
                error={phoneBad(s[w].number) ? t("common.phoneInvalid") : undefined}
              >
                <Input
                  id={`${id}-number`}
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="01XXXXXXXXX"
                  value={s[w].number}
                  aria-invalid={phoneBad(s[w].number) || undefined}
                  aria-describedby={`${id}-number-msg`}
                  onChange={(e) => wallet(w, { number: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                  className="tabular-nums"
                />
              </Field>
              <Field
                id={`${id}-type`}
                label={t("settingsAdmin.accountType")}
                help={t("adminui.settings.typeHelp")}
              >
                <NativeSelect
                  id={`${id}-type`}
                  value={s[w].accountType}
                  aria-describedby={`${id}-type-msg`}
                  onChange={(e) =>
                    wallet(w, { accountType: e.target.value as Settings[Wallet]["accountType"] })
                  }
                >
                  <option value="personal">{t("pay.account.personal")}</option>
                  <option value="agent">{t("pay.account.agent")}</option>
                  <option value="merchant">{t("pay.account.merchant")}</option>
                </NativeSelect>
              </Field>
              <Field
                id={`${id}-pct`}
                label={t("settingsAdmin.feePct")}
                error={amountError(`${w}Pct`)}
                help={t("adminui.settings.pctHelp")}
              >
                {moneyInput(`${w}Pct`, `${id}-pct`, "%")}
              </Field>
              <Field
                id={`${id}-flat`}
                label={t("settingsAdmin.feeFlat")}
                error={amountError(`${w}Flat`)}
                help={
                  fee === null
                    ? undefined
                    : t("adminui.settings.feeExample", { amount: taka(fmt, EXAMPLE), fee: taka(fmt, fee) })
                }
              >
                {moneyInput(`${w}Flat`, `${id}-flat`)}
              </Field>
            </div>
          </SectionCard>
        );
      })}

      <SectionCard
        title={t("pay.method.cod")}
        description={t("settingsAdmin.codSub")}
        icon={Banknote}
        actions={
          <StatusBadge tone={s.cod.enabled ? "success" : "neutral"}>
            {s.cod.enabled ? t("adminui.settings.live") : t("adminui.settings.off")}
          </StatusBadge>
        }
        bodyClassName="grid gap-5"
      >
        <div className="flex items-center justify-between gap-4 rounded-(--radius-lg) bg-muted/50 px-3 py-2.5">
          <Label htmlFor={`${uid}-cod-on`}>{t("settingsAdmin.acceptHere")}</Label>
          <Switch
            id={`${uid}-cod-on`}
            checked={s.cod.enabled}
            onCheckedChange={(enabled) => setS((p) => ({ ...p, cod: { ...p.cod, enabled } }))}
          />
        </div>
        <Field
          id={`${uid}-cod-max`}
          label={t("settingsAdmin.codMax")}
          error={amountError("codMax")}
          help={t("adminui.settings.codHelp")}
          className="sm:max-w-xs"
        >
          {moneyInput("codMax", `${uid}-cod-max`)}
        </Field>
      </SectionCard>

      <SectionCard
        title={t("settingsAdmin.delivery")}
        description={t("adminui.settings.deliverySub")}
        icon={Truck}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["inside", "settingsAdmin.inside"],
              ["outside", "settingsAdmin.outside"],
              ["freeFrom", "settingsAdmin.freeFrom"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} id={`${uid}-d-${key}`} label={t(label)} error={amountError(key)}>
              {moneyInput(key, `${uid}-d-${key}`)}
            </Field>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={t("settingsAdmin.support")}
        description={t("adminui.settings.supportSub")}
        icon={Headset}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id={`${uid}-support-phone`}
            label={t("settingsAdmin.supportPhone")}
            help={t("adminui.settings.supportHelp")}
            error={phoneBad(s.supportPhone) ? t("common.phoneInvalid") : undefined}
          >
            <Input
              id={`${uid}-support-phone`}
              inputMode="tel"
              placeholder="01XXXXXXXXX"
              value={s.supportPhone}
              aria-invalid={phoneBad(s.supportPhone) || undefined}
              aria-describedby={`${uid}-support-phone-msg`}
              onChange={(e) =>
                setS((p) => ({ ...p, supportPhone: e.target.value.replace(/\D/g, "").slice(0, 11) }))
              }
              className="tabular-nums"
            />
          </Field>
          <Field
            id={`${uid}-review-hours`}
            label={t("settingsAdmin.reviewHours")}
            help={t("adminui.settings.hoursHelp")}
          >
            <Input
              id={`${uid}-review-hours`}
              maxLength={80}
              value={s.reviewHours}
              aria-describedby={`${uid}-review-hours-msg`}
              onChange={(e) => setS((p) => ({ ...p, reviewHours: e.target.value }))}
            />
          </Field>
        </div>
      </SectionCard>

      {/* Save bar: sticks above the phone tab bar, at the bottom of the screen on desktop. */}
      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 md:bottom-4">
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-(--radius-2xl) bg-card/95 px-4 py-3 shadow-(--shadow-overlay) ring-1 backdrop-blur-md",
            dirty ? "ring-primary/30" : "ring-foreground/6",
          )}
        >
          <p className="text-sm font-medium" aria-live="polite">
            {invalid ? (
              <span className="text-destructive">{t("adminui.settings.fixErrors")}</span>
            ) : dirty ? (
              t("adminui.settings.unsaved")
            ) : (
              <span className="text-muted-foreground">{t("adminui.settings.allSaved")}</span>
            )}
          </p>
          <div className="flex gap-2 max-sm:w-full">
            {dirty ? (
              <Button
                type="button"
                variant="ghost"
                onClick={reset}
                disabled={pending}
                className="max-sm:flex-1"
              >
                <RotateCcw aria-hidden="true" />
                {t("adminui.settings.undo")}
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="brand"
              disabled={pending || !dirty || invalid}
              className="max-sm:flex-1"
            >
              <Save aria-hidden="true" />
              {pending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
