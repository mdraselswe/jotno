"use client";

import { Check, Copy, Info, ShieldCheck, Truck, Wallet as WalletIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PayMethod, Wallet } from "@/features/settings";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { chooseCashOnDelivery, submitManualPayment } from "../server/manual";

export interface WalletOption {
  method: Wallet;
  number: string;
  accountType: "personal" | "agent" | "merchant";
  /** Charge the payer adds on top, in poisha. */
  fee: number;
}

const BRAND: Record<PayMethod, string> = {
  bkash: "bg-bkash text-white",
  nagad: "bg-nagad text-white",
  cod: "bg-primary text-primary-foreground",
};

function CopyButton({ value, done }: { value: string; done: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          toast.success(done);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {t("pay.copy")}
    </Button>
  );
}

/**
 * Paying by bKash/Nagad send money: pick the wallet, send amount + charge to
 * our number, then type the number it came from and the TrxID. Shop orders can
 * choose cash on delivery instead.
 */
export function ManualPay({
  paymentId,
  amount,
  wallets,
  cod,
  note,
}: {
  paymentId: string;
  amount: number;
  wallets: WalletOption[];
  cod: boolean;
  /** Why the last TrxID was rejected. */
  note: string | null;
}) {
  const t = useT();
  const fmt = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const reduce = useReducedMotion();
  const methods: PayMethod[] = [...wallets.map((w) => w.method), ...(cod ? (["cod"] as const) : [])];
  const [method, setMethod] = useState<PayMethod | undefined>(methods[0]);
  const [phone, setPhone] = useState("");
  const [trx, setTrx] = useState("");
  const [pending, start] = useTransition();
  const money = (p: number) =>
    fmt.money(p / 100, { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 });

  if (!method) return <p className="text-muted-foreground">{t("pay.noMethods")}</p>;
  const wallet = wallets.find((w) => w.method === method);
  const walletName = t(`pay.method.${method}`);
  const total = amount + (wallet?.fee ?? 0);

  const submit = () =>
    start(async () => {
      if (!wallet) return;
      const r = await submitManualPayment(locale, paymentId, {
        method: wallet.method,
        payerPhone: phone,
        trxId: trx,
      });
      if (r.ok) router.refresh();
      else toast.error(t(r.error));
    });

  const placeCod = () =>
    start(async () => {
      const r = await chooseCashOnDelivery(locale, paymentId);
      if (r.ok) {
        toast.success(t("pay.codPlaced"));
        router.refresh();
      } else toast.error(t(r.error));
    });

  return (
    <div className="grid gap-5">
      {note ? (
        <p
          role="alert"
          className="rounded-(--radius-lg) bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {t("pay.rejected", { reason: note })}
        </p>
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">{t("pay.choose")}</legend>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
          {methods.map((m) => (
            <label
              key={m}
              className={cn(
                "relative flex cursor-pointer flex-col items-center gap-2 rounded-(--radius-lg) bg-card px-3 py-4 text-center text-sm font-medium shadow-(--shadow-card) transition-[transform,box-shadow] duration-(--motion-fast) ease-(--ease-out) active:scale-[0.97] has-focus-visible:ring-2 has-focus-visible:ring-ring",
                method === m && "ring-2 ring-primary",
              )}
            >
              <input
                type="radio"
                name="pay-method"
                value={m}
                checked={method === m}
                onChange={() => setMethod(m)}
                className="sr-only"
              />
              <span className={cn("grid size-10 place-items-center rounded-full", BRAND[m])}>
                {m === "cod" ? (
                  <Truck aria-hidden="true" className="size-5" />
                ) : (
                  <WalletIcon aria-hidden="true" className="size-5" />
                )}
              </span>
              {t(`pay.method.${m}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={method}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="grid gap-5"
        >
          {wallet ? (
            <>
              <dl className="grid gap-2 rounded-(--radius-xl) bg-muted/60 p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("pay.amount")}</dt>
                  <dd className="tabular-nums">{money(amount)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("pay.charge", { wallet: walletName })}</dt>
                  <dd className="tabular-nums">{money(wallet.fee)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                  <dt className="font-semibold">{t("pay.sendTotal")}</dt>
                  <dd className="flex items-center gap-2">
                    <span className="font-heading text-2xl font-semibold tabular-nums">{money(total)}</span>
                    <CopyButton value={String(total / 100)} done={t("pay.copiedAmount")} />
                  </dd>
                </div>
              </dl>

              <ol className="grid gap-3 text-sm">
                <li className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    1
                  </span>
                  {t(wallet.accountType === "merchant" ? "pay.step1Merchant" : "pay.step1", {
                    wallet: walletName,
                  })}
                </li>
                <li className="grid gap-2">
                  <span className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      2
                    </span>
                    {t("pay.step2", { amount: money(total), number: wallet.number })}
                  </span>
                  <span className="ml-9 flex flex-wrap items-center gap-2 rounded-(--radius-lg) bg-card px-3 py-2 shadow-(--shadow-card)">
                    <span
                      className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", BRAND[wallet.method])}
                    >
                      {walletName} · {t(`pay.account.${wallet.accountType}`)}
                    </span>
                    <span className="font-mono text-lg font-semibold tracking-wider">{wallet.number}</span>
                    <span className="ml-auto">
                      <CopyButton value={wallet.number} done={t("pay.copiedNumber")} />
                    </span>
                  </span>
                  {wallet.accountType === "personal" ? (
                    <span className="ml-9 flex gap-2 text-xs text-muted-foreground">
                      <Info aria-hidden="true" className="size-4 shrink-0" />
                      {t("pay.personalNote", { wallet: walletName })}
                    </span>
                  ) : null}
                </li>
                <li className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    3
                  </span>
                  {t("pay.step3")}
                </li>
              </ol>

              <form
                className="grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="pay-phone">{t("pay.sendFrom", { wallet: walletName })}</Label>
                  <Input
                    id="pay-phone"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="01XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pay-trx">{t("pay.trxId")}</Label>
                  <Input
                    id="pay-trx"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono tracking-wider uppercase"
                    placeholder="9BK7XA2MLQ"
                    aria-describedby="pay-trx-hint"
                    value={trx}
                    onChange={(e) =>
                      setTrx(
                        e.target.value
                          .replace(/[^a-z0-9]/gi, "")
                          .toUpperCase()
                          .slice(0, 12),
                      )
                    }
                    required
                  />
                  <p id="pay-trx-hint" className="text-xs text-muted-foreground">
                    {t("pay.trxHint")}
                  </p>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={pending || !/^01[3-9]\d{8}$/.test(phone) || trx.length < 8}
                >
                  <Check aria-hidden="true" />
                  {t("pay.submit")}
                </Button>
              </form>
            </>
          ) : (
            <div className="grid gap-4">
              <p className="text-pretty text-muted-foreground">{t("pay.codSub")}</p>
              <p className="flex items-center justify-between rounded-(--radius-xl) bg-muted/60 p-4">
                <span className="font-semibold">{t("shop.total")}</span>
                <span className="font-heading text-2xl font-semibold tabular-nums">{money(amount)}</span>
              </p>
              <Button size="lg" disabled={pending} onClick={placeCod}>
                <Truck aria-hidden="true" />
                {t("pay.codConfirm")}
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="flex gap-2 text-xs text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
        {t("pay.safe")}
      </p>
    </div>
  );
}
