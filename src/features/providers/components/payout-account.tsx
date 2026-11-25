"use client";

import { Building2, Check, Copy, LoaderCircle, Smartphone } from "lucide-react";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MessageKey } from "@/i18n";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import {
  PAYOUT_METHODS,
  payoutAccountLine,
  payoutAccountSchema,
  type PayoutAccount,
  type PayoutMethod,
} from "../payout-account";
import { savePayoutAccount } from "../server/actions";

const METHOD_LABEL: Record<PayoutMethod, MessageKey> = {
  bkash: "pay.method.bkash",
  nagad: "pay.method.nagad",
  bank: "vetui.payout.bank",
};

type Fields = "number" | "bankName" | "accountName" | "accountNumber" | "branch";
const ERROR: Record<Fields, MessageKey> = {
  number: "vetui.payout.errNumber",
  bankName: "vetui.payout.errText",
  accountName: "vetui.payout.errText",
  accountNumber: "vetui.payout.errAccount",
  branch: "vetui.payout.errText",
};

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-pretty text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** The vet's payout account form (earnings page): bKash/Nagad number or a bank account. */
export function PayoutAccountForm({ initial }: { initial: PayoutAccount | null }) {
  const t = useT();
  const [method, setMethod] = useState<PayoutMethod>(initial?.method ?? "bkash");
  const [values, setValues] = useState<Record<Fields, string>>({
    number: initial && initial.method !== "bank" ? initial.number : "",
    bankName: initial?.method === "bank" ? initial.bankName : "",
    accountName: initial?.method === "bank" ? initial.accountName : "",
    accountNumber: initial?.method === "bank" ? initial.accountNumber : "",
    branch: initial?.method === "bank" ? initial.branch : "",
  });
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [pending, start] = useTransition();

  const input =
    method === "bank"
      ? {
          method,
          bankName: values.bankName,
          accountName: values.accountName,
          accountNumber: values.accountNumber,
          branch: values.branch,
        }
      : { method, number: values.number };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = payoutAccountSchema.safeParse(input);
    if (!parsed.success) {
      const next: Partial<Record<Fields, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && key in ERROR) next[key as Fields] = t(ERROR[key as Fields]);
      }
      setErrors(next);
      return;
    }
    setErrors({});
    start(async () => {
      const r = await savePayoutAccount(parsed.data);
      if (r.ok) toast.success(t("vetui.payout.saved"));
      else toast.error(t(r.error));
    });
  }

  const field = (key: Fields) => ({
    id: `po-${key}`,
    value: values[key],
    onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value })),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `po-${key}-error` : undefined,
  });

  return (
    <form noValidate onSubmit={onSubmit} className="@container grid gap-5">
      <fieldset className="grid gap-2.5">
        <legend className="mb-2.5 text-sm font-medium">{t("vetui.payout.method")}</legend>
        <div className="grid grid-cols-3 gap-2">
          {PAYOUT_METHODS.map((m) => {
            const Icon = m === "bank" ? Building2 : Smartphone;
            return (
              <label
                key={m}
                className={cn(
                  "flex min-h-(--control-h) cursor-pointer items-center justify-center gap-1.5 rounded-(--control-radius) bg-card px-2 py-2 text-center text-sm font-medium ring-1 ring-foreground/12 transition-colors duration-(--motion-fast) hover:bg-muted",
                  "has-checked:bg-primary/10 has-checked:text-primary has-checked:ring-2 has-checked:ring-primary",
                  "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                )}
              >
                <input
                  type="radio"
                  name="payout-method"
                  value={m}
                  checked={method === m}
                  onChange={() => {
                    setMethod(m);
                    setErrors({});
                  }}
                  className="sr-only"
                />
                <Icon aria-hidden="true" className="size-4 shrink-0 max-[380px]:hidden" />
                {t(METHOD_LABEL[m])}
              </label>
            );
          })}
        </div>
      </fieldset>

      {method === "bank" ? (
        <div className="grid gap-4 @md:grid-cols-2">
          <Field id="po-bankName" label={t("vetui.payout.bankName")} error={errors.bankName}>
            <Input autoComplete="off" maxLength={80} {...field("bankName")} />
          </Field>
          <Field id="po-branch" label={t("vetui.payout.branch")} error={errors.branch}>
            <Input autoComplete="off" maxLength={80} {...field("branch")} />
          </Field>
          <Field id="po-accountName" label={t("vetui.payout.accountName")} error={errors.accountName}>
            <Input autoComplete="name" maxLength={80} {...field("accountName")} />
          </Field>
          <Field id="po-accountNumber" label={t("vetui.payout.accountNumber")} error={errors.accountNumber}>
            <Input inputMode="numeric" autoComplete="off" maxLength={30} {...field("accountNumber")} />
          </Field>
        </div>
      ) : (
        <Field
          id="po-number"
          label={t("vetui.payout.number")}
          hint={t("vetui.payout.numberHint")}
          error={errors.number}
        >
          <Input type="tel" inputMode="tel" autoComplete="tel" maxLength={20} {...field("number")} />
        </Field>
      )}

      <Button
        type="submit"
        variant="brand"
        disabled={pending}
        aria-busy={pending}
        className="justify-self-start"
      >
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
        {t("vetui.payout.save")}
      </Button>
    </form>
  );
}

/** Admin payouts: a vet's payout account, read-only, with a copy button. */
export function PayoutAccountView({ account, name }: { account: PayoutAccount | null; name: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  if (!account) {
    return (
      <p className="text-sm font-medium text-warning-foreground dark:text-warning">
        {t("vetui.payout.none")}
      </p>
    );
  }
  const line = payoutAccountLine(account);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="grid min-w-0 gap-0.5 text-sm">
        <span className="text-xs text-muted-foreground">
          {t("vetui.payout.payTo")} · {t(METHOD_LABEL[account.method])}
        </span>
        <span className="font-mono font-semibold break-all">{line}</span>
      </p>
      <Button
        type="button"
        size="sm"
        variant={copied ? "secondary" : "outline"}
        aria-label={t("vetui.payout.copy", { name })}
        onClick={() => {
          void navigator.clipboard
            ?.writeText(line)
            .then(() => {
              setCopied(true);
              toast.success(t("vetui.payout.copied"));
              setTimeout(() => setCopied(false), 1600);
            })
            .catch(() => toast.error(t("payui.copyFailed")));
        }}
      >
        {copied ? <Check aria-hidden="true" className="text-success" /> : <Copy aria-hidden="true" />}
        {copied ? t("vetui.payout.copied") : t("pay.copy")}
      </Button>
    </div>
  );
}
