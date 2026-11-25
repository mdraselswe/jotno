"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Info,
  Loader2,
  Lock,
  Receipt,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PayMethod, Wallet } from "@/features/settings";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { chooseCashOnDelivery, submitManualPayment } from "../server/manual";
import { WalletMark } from "./wallet-mark";

export interface WalletOption {
  method: Wallet;
  number: string;
  accountType: "personal" | "agent" | "merchant";
  /** Charge the payer adds on top, in poisha. */
  fee: number;
}

// The same rules the server checks (server/manual.ts, settings trxIdSchema).
const PHONE = /^01[3-9]\d{8}$/;
const TRX = /^[A-Z0-9]{8,12}$/;
const FORM_ID = "manual-pay-form";

function CopyButton({ value, done, label }: { value: string; done: string; label: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant={copied ? "secondary" : "outline"}
      aria-label={label}
      onClick={() => {
        void navigator.clipboard
          ?.writeText(value)
          .then(() => {
            setCopied(true);
            toast.success(done);
            setTimeout(() => setCopied(false), 1600);
          })
          .catch(() => toast.error(t("payui.copyFailed")));
      }}
      className="shrink-0"
    >
      {copied ? <Check aria-hidden="true" className="text-success" /> : <Copy aria-hidden="true" />}
      {copied ? t("payui.copied") : t("pay.copy")}
    </Button>
  );
}

function Step({
  n,
  title,
  last = false,
  children,
}: {
  n: number;
  title: ReactNode;
  last?: boolean;
  children?: ReactNode;
}) {
  const fmt = useFormatter();
  return (
    <li className={cn("relative flex gap-3", !last && "pb-5")}>
      {last ? null : (
        <span aria-hidden="true" className="absolute top-8 bottom-1 left-3.5 w-px bg-foreground/10" />
      )}
      <span className="relative grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {fmt.number(n)}
      </span>
      <div className="grid min-w-0 flex-1 gap-2 pt-0.5">
        <p className="text-sm font-medium text-pretty">{title}</p>
        {children}
      </div>
    </li>
  );
}

function FieldError({ id, msg }: { id: string; msg: string | null }) {
  return msg ? (
    <p id={id} className="flex items-center gap-1.5 text-xs font-medium text-destructive">
      <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
      {msg}
    </p>
  ) : null;
}

const card = "rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6";

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
  title,
  detail,
  deadline,
}: {
  paymentId: string;
  amount: number;
  wallets: WalletOption[];
  cod: boolean;
  /** Why the last TrxID was rejected. */
  note: string | null;
  /** What is being paid for ("Order #1042", a vet's name). */
  title: string;
  detail: string | null;
  /** "Pay by …" (already formatted), or null. */
  deadline: string | null;
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
  const [touched, setTouched] = useState({ phone: false, trx: false });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const phoneRef = useRef<HTMLInputElement>(null);
  const trxRef = useRef<HTMLInputElement>(null);
  const money = (p: number) =>
    fmt.money(p / 100, { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 });

  if (!method)
    return (
      <div className={cn(card, "grid justify-items-center gap-3 p-8 text-center")}>
        <Clock aria-hidden="true" className="size-8 text-muted-foreground" />
        <p className="text-pretty text-muted-foreground">{t("pay.noMethods")}</p>
      </div>
    );
  const wallet = wallets.find((w) => w.method === method);
  const walletName = t(`pay.method.${method}`);
  const fee = wallet?.fee ?? 0;
  const total = amount + fee;
  const problems = {
    phone: PHONE.test(phone) ? null : t("payui.err.phone", { wallet: walletName }),
    trx: TRX.test(trx) ? null : t("payui.err.trx"),
  };
  const show = (f: "phone" | "trx") => (touched[f] ? problems[f] : null);

  const submit = () => {
    if (pending || !wallet) return;
    setError(null);
    if (problems.phone || problems.trx) {
      setTouched({ phone: true, trx: true });
      (problems.phone ? phoneRef : trxRef).current?.focus();
      return;
    }
    start(async () => {
      const r = await submitManualPayment(locale, paymentId, {
        method: wallet.method,
        payerPhone: phone,
        trxId: trx,
      });
      if (r.ok) {
        toast.success(t("payui.sentToast"));
        router.refresh();
      } else setError(t(r.error));
    });
  };

  const placeCod = () =>
    start(async () => {
      setError(null);
      const r = await chooseCashOnDelivery(locale, paymentId);
      if (r.ok) {
        toast.success(t("pay.codPlaced"));
        router.refresh();
      } else setError(t(r.error));
    });

  return (
    <div className="grid gap-4">
      {/* What you are paying for */}
      <section aria-label={t("payui.summary")} className={cn(card, "grid gap-4 p-4 sm:p-6")}>
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-(--radius-lg) bg-primary/10 text-primary">
            <Receipt aria-hidden="true" className="size-5" />
          </span>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="text-xs font-medium text-muted-foreground">{t("pay.for")}</p>
            <h1 className="font-heading text-lg leading-tight font-bold text-balance">{title}</h1>
            {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
          </div>
          <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-success/12 px-2 text-xs font-semibold text-success dark:text-[color-mix(in_oklch,var(--success),white_35%)]">
            <Lock aria-hidden="true" className="size-3" />
            <span className="max-[380px]:sr-only">{t("payui.secure")}</span>
          </span>
        </div>
        <dl className="grid gap-2 rounded-(--radius-xl) bg-muted/50 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t("pay.amount")}</dt>
            <dd className="tabular-nums">{money(amount)}</dd>
          </div>
          {wallet ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("pay.charge", { wallet: walletName })}</dt>
              <dd className="tabular-nums">{fee > 0 ? money(fee) : t("shop.free")}</dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-3 border-t pt-3">
            <dt className="font-semibold">{wallet ? t("pay.sendTotal") : t("shop.total")}</dt>
            <dd className="font-heading text-3xl leading-none font-bold tabular-nums">{money(total)}</dd>
          </div>
        </dl>
        {deadline ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock aria-hidden="true" className="size-4 shrink-0 text-primary" />
            {deadline}
          </p>
        ) : null}
      </section>

      {note ? (
        <p
          role="alert"
          className="flex gap-2.5 rounded-(--radius-xl) bg-destructive/8 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/20"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("pay.rejected", { reason: note })}
        </p>
      ) : null}

      {/* How to pay */}
      <fieldset className={cn(card, "grid gap-3 p-4 sm:p-6")}>
        <legend className="float-left mb-1 w-full font-heading text-base font-bold">{t("pay.choose")}</legend>
        <div
          className={cn(
            "grid gap-2.5",
            methods.length > 1 && "sm:grid-cols-2",
            methods.length > 2 && "sm:grid-cols-3",
          )}
        >
          {methods.map((m) => {
            const w = wallets.find((x) => x.method === m);
            const on = method === m;
            return (
              <label
                key={m}
                className={cn(
                  "relative flex cursor-pointer items-center gap-3 rounded-(--radius-xl) bg-card p-3 ring-1 transition-[box-shadow,scale] duration-(--motion-fast) ease-(--ease-press) active:scale-[0.98] has-focus-visible:ring-3 has-focus-visible:ring-ring/50 sm:flex-col sm:items-start sm:p-4",
                  on
                    ? "shadow-(--shadow-card) ring-2 ring-primary"
                    : "ring-foreground/12 hover:ring-foreground/25",
                )}
              >
                <input
                  type="radio"
                  name="pay-method"
                  value={m}
                  checked={on}
                  onChange={() => {
                    setMethod(m);
                    setError(null);
                  }}
                  className="sr-only"
                />
                <WalletMark method={m} label={t(`pay.method.${m}`)} variant="tile" />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="font-heading font-bold">{t(`pay.method.${m}`)}</span>
                  <span className="text-xs text-muted-foreground">
                    {w
                      ? w.fee > 0
                        ? t("payui.chargeIs", { amount: money(w.fee) })
                        : t("payui.noCharge")
                      : t("payui.codShort")}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full ring-2 transition-colors sm:absolute sm:top-3 sm:right-3",
                    on ? "bg-primary text-primary-foreground ring-primary" : "ring-foreground/20",
                  )}
                >
                  {on ? <Check className="size-3.5" /> : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={method}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="grid gap-4"
        >
          {wallet ? (
            <>
              <section className={cn(card, "grid gap-4 p-4 sm:p-6")} aria-labelledby="pay-steps">
                <h2 id="pay-steps" className="flex items-center gap-2 font-heading text-base font-bold">
                  <WalletMark method={wallet.method} label={walletName} />
                  {t("payui.howTo", { wallet: walletName })}
                </h2>
                <ol>
                  <Step
                    n={1}
                    title={t(wallet.accountType === "merchant" ? "pay.step1Merchant" : "pay.step1", {
                      wallet: walletName,
                    })}
                  />
                  <Step n={2} title={t("payui.stepNumber")}>
                    <div className="flex flex-wrap items-center gap-2 rounded-(--radius-xl) bg-muted/50 p-3">
                      <span className="grid min-w-0 flex-1">
                        <span className="font-mono text-xl font-bold tracking-wider tabular-nums select-all">
                          {wallet.number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {walletName} · {t(`pay.account.${wallet.accountType}`)}
                        </span>
                      </span>
                      <CopyButton
                        value={wallet.number}
                        done={t("pay.copiedNumber")}
                        label={t("payui.copyNumber")}
                      />
                    </div>
                    {wallet.accountType === "personal" ? (
                      <p className="flex gap-2 text-xs text-muted-foreground">
                        <Info aria-hidden="true" className="size-4 shrink-0 text-primary" />
                        {t("pay.personalNote", { wallet: walletName })}
                      </p>
                    ) : null}
                  </Step>
                  <Step n={3} title={t("payui.stepAmount")}>
                    <div className="flex flex-wrap items-center gap-2 rounded-(--radius-xl) bg-muted/50 p-3">
                      <span className="grid min-w-0 flex-1">
                        <span className="font-heading text-xl font-bold tabular-nums">{money(total)}</span>
                        {fee > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {t("payui.inclCharge", { amount: money(amount), fee: money(fee) })}
                          </span>
                        ) : null}
                      </span>
                      <CopyButton
                        value={String(total / 100)}
                        done={t("pay.copiedAmount")}
                        label={t("payui.copyAmount")}
                      />
                    </div>
                  </Step>
                  <Step n={4} title={t("pay.step3")} last />
                </ol>
              </section>

              <form
                id={FORM_ID}
                noValidate
                className={cn(card, "grid gap-4 p-4 sm:p-6")}
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <h2 className="font-heading text-base font-bold">{t("payui.confirmTitle")}</h2>
                <div className="grid gap-1.5">
                  <Label htmlFor="pay-phone">{t("pay.sendFrom", { wallet: walletName })}</Label>
                  <Input
                    ref={phoneRef}
                    id="pay-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="01XXXXXXXXX"
                    className="font-mono text-base tracking-wider"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
                    onBlur={() => setTouched((x) => ({ ...x, phone: true }))}
                    aria-invalid={show("phone") ? true : undefined}
                    aria-describedby={show("phone") ? "pay-phone-err" : undefined}
                  />
                  <FieldError id="pay-phone-err" msg={show("phone")} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="pay-trx">{t("pay.trxId")}</Label>
                  <Input
                    ref={trxRef}
                    id="pay-trx"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono text-base tracking-wider uppercase"
                    placeholder="9BK7XA2MLQ"
                    aria-invalid={show("trx") ? true : undefined}
                    aria-describedby={show("trx") ? "pay-trx-err" : "pay-trx-hint"}
                    value={trx}
                    onChange={(e) =>
                      setTrx(
                        e.target.value
                          .replace(/[^a-z0-9]/gi, "")
                          .toUpperCase()
                          .slice(0, 12),
                      )
                    }
                    onBlur={() => setTouched((x) => ({ ...x, trx: true }))}
                  />
                  {show("trx") ? (
                    <FieldError id="pay-trx-err" msg={show("trx")} />
                  ) : (
                    <p id="pay-trx-hint" className="text-xs text-muted-foreground">
                      {t("pay.trxHint")}
                    </p>
                  )}
                </div>
                {error ? (
                  <p
                    role="alert"
                    className="rounded-(--radius-md) bg-destructive/8 px-3 py-2 text-sm text-destructive"
                  >
                    {error}
                  </p>
                ) : null}
              </form>
            </>
          ) : (
            <section className={cn(card, "grid gap-4 p-4 sm:p-6")} aria-labelledby="pay-cod">
              <div className="flex items-start gap-3">
                <WalletMark method="cod" label={walletName} variant="tile" />
                <div className="grid gap-1">
                  <h2 id="pay-cod" className="font-heading text-base font-bold">
                    {t("pay.method.cod")}
                  </h2>
                  <p className="text-sm text-pretty text-muted-foreground">{t("pay.codSub")}</p>
                </div>
              </div>
              <ul className="grid gap-2 text-sm">
                <li className="flex gap-2">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                  {t("payui.codPoint1")}
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                  {t("payui.codPoint2", { amount: money(amount) })}
                </li>
              </ul>
              {error ? (
                <p
                  role="alert"
                  className="rounded-(--radius-md) bg-destructive/8 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="flex gap-2.5 rounded-(--radius-xl) bg-primary/6 px-4 py-3 text-xs text-pretty text-foreground/80 ring-1 ring-primary/15">
        <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
        {t("pay.safe")}
      </p>

      {/* The main button: sticky above the tab bar on phones, in the flow from sm. */}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        {wallet ? (
          <Button
            type="submit"
            form={FORM_ID}
            variant="brand"
            size="lg"
            className="w-full"
            disabled={pending}
          >
            {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}
            {pending ? t("payui.sending") : t("pay.submit")}
          </Button>
        ) : (
          <Button variant="brand" size="lg" className="w-full" disabled={pending} onClick={placeCod}>
            {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Truck aria-hidden="true" />}
            {t("pay.codConfirm")}
          </Button>
        )}
      </div>
    </div>
  );
}
