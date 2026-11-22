"use client";

import { Save } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/i18n/client";
import { toPoisha } from "@/lib/money";
import { WALLETS, type Settings, type Wallet } from "../model";
import { saveSettings } from "../server/actions";

const taka = (poisha: number) => String(poisha / 100);

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)">
      <header className="grid gap-1">
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        {sub ? <p className="text-sm text-muted-foreground">{sub}</p> : null}
      </header>
      {children}
    </section>
  );
}

/** Admin: wallet numbers and charges, cash on delivery, delivery fees, support number. */
export function SettingsForm({ initial }: { initial: Settings }) {
  const t = useT();
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  // Money fields are typed as taka; kept as text while editing.
  const [money, setMoney] = useState({
    codMax: taka(initial.cod.maxOrder),
    inside: taka(initial.delivery.inside),
    outside: taka(initial.delivery.outside),
    freeFrom: taka(initial.delivery.freeFrom),
    bkashFlat: taka(initial.bkash.feeFlat),
    nagadFlat: taka(initial.nagad.feeFlat),
    bkashPct: String(initial.bkash.feeBps / 100),
    nagadPct: String(initial.nagad.feeBps / 100),
  });

  const wallet = (w: Wallet, patch: Partial<Settings[Wallet]>) =>
    setS((prev) => ({ ...prev, [w]: { ...prev[w], ...patch } }));

  function submit() {
    const pct = (v: string) => Math.round(Number(v) * 100);
    const next: Settings = {
      ...s,
      bkash: { ...s.bkash, feeBps: pct(money.bkashPct), feeFlat: toPoisha(money.bkashFlat) ?? -1 },
      nagad: { ...s.nagad, feeBps: pct(money.nagadPct), feeFlat: toPoisha(money.nagadFlat) ?? -1 },
      cod: { ...s.cod, maxOrder: toPoisha(money.codMax) ?? -1 },
      delivery: {
        inside: toPoisha(money.inside) ?? -1,
        outside: toPoisha(money.outside) ?? -1,
        freeFrom: toPoisha(money.freeFrom) ?? -1,
      },
    };
    start(async () => {
      const r = await saveSettings(next);
      if (r.ok) toast.success(t("common.saved"));
      else toast.error(t(r.error));
    });
  }

  return (
    <form
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {WALLETS.map((w) => (
        <Section key={w} title={t(`pay.method.${w}`)} sub={t("settingsAdmin.walletSub")}>
          <div className="flex items-center gap-3">
            <Switch
              id={`${w}-on`}
              checked={s[w].enabled}
              onCheckedChange={(enabled) => wallet(w, { enabled })}
            />
            <Label htmlFor={`${w}-on`}>{t("settingsAdmin.acceptHere")}</Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`${w}-number`}>{t("settingsAdmin.number")}</Label>
              <Input
                id={`${w}-number`}
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                value={s[w].number}
                onChange={(e) => wallet(w, { number: e.target.value.replace(/\D/g, "").slice(0, 11) })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${w}-type`}>{t("settingsAdmin.accountType")}</Label>
              <NativeSelect
                id={`${w}-type`}
                value={s[w].accountType}
                onChange={(e) =>
                  wallet(w, { accountType: e.target.value as Settings[Wallet]["accountType"] })
                }
              >
                <option value="personal">{t("pay.account.personal")}</option>
                <option value="agent">{t("pay.account.agent")}</option>
                <option value="merchant">{t("pay.account.merchant")}</option>
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${w}-pct`}>{t("settingsAdmin.feePct")}</Label>
              <Input
                id={`${w}-pct`}
                inputMode="decimal"
                value={money[`${w}Pct`]}
                onChange={(e) => setMoney((m) => ({ ...m, [`${w}Pct`]: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${w}-flat`}>{t("settingsAdmin.feeFlat")}</Label>
              <Input
                id={`${w}-flat`}
                inputMode="decimal"
                value={money[`${w}Flat`]}
                onChange={(e) => setMoney((m) => ({ ...m, [`${w}Flat`]: e.target.value }))}
              />
            </div>
          </div>
        </Section>
      ))}

      <Section title={t("pay.method.cod")} sub={t("settingsAdmin.codSub")}>
        <div className="flex items-center gap-3">
          <Switch
            id="cod-on"
            checked={s.cod.enabled}
            onCheckedChange={(enabled) => setS((p) => ({ ...p, cod: { ...p.cod, enabled } }))}
          />
          <Label htmlFor="cod-on">{t("settingsAdmin.acceptHere")}</Label>
        </div>
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="cod-max">{t("settingsAdmin.codMax")}</Label>
          <Input
            id="cod-max"
            inputMode="decimal"
            value={money.codMax}
            onChange={(e) => setMoney((m) => ({ ...m, codMax: e.target.value }))}
          />
        </div>
      </Section>

      <Section title={t("settingsAdmin.delivery")}>
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["inside", "settingsAdmin.inside"],
              ["outside", "settingsAdmin.outside"],
              ["freeFrom", "settingsAdmin.freeFrom"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="grid gap-2">
              <Label htmlFor={`d-${key}`}>{t(label)}</Label>
              <Input
                id={`d-${key}`}
                inputMode="decimal"
                value={money[key]}
                onChange={(e) => setMoney((m) => ({ ...m, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("settingsAdmin.support")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="support-phone">{t("settingsAdmin.supportPhone")}</Label>
            <Input
              id="support-phone"
              inputMode="tel"
              placeholder="01XXXXXXXXX"
              value={s.supportPhone}
              onChange={(e) =>
                setS((p) => ({ ...p, supportPhone: e.target.value.replace(/\D/g, "").slice(0, 11) }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="review-hours">{t("settingsAdmin.reviewHours")}</Label>
            <Input
              id="review-hours"
              value={s.reviewHours}
              onChange={(e) => setS((p) => ({ ...p, reviewHours: e.target.value }))}
            />
          </div>
        </div>
      </Section>

      <Button type="submit" size="lg" disabled={pending} className="justify-self-start">
        <Save aria-hidden="true" />
        {t("common.save")}
      </Button>
    </form>
  );
}
