"use client";

import { CreditCard, FlaskConical } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";
import { useFormatter, useT } from "@/i18n/client";

/**
 * The pretend gateway page (development and the demo only). It posts back to
 * our return URL exactly like SSLCommerz posts form fields.
 */
export function MockCheckout() {
  const t = useT();
  const fmt = useFormatter();
  const params = useSearchParams();
  const id = useId();
  const mounted = useMounted();
  const payment = params.get("payment") ?? "";
  const amount = Number(params.get("amount") ?? "0");
  const product = params.get("product") ?? "";
  const sameOrigin = (u: string | null) => {
    try {
      return u && new URL(u).origin === window.location.origin ? u : null;
    } catch {
      return null;
    }
  };
  const success = !mounted ? null : sameOrigin(params.get("success"));
  const fail = !mounted ? null : sameOrigin(params.get("fail"));
  const cancel = !mounted ? null : sameOrigin(params.get("cancel"));
  const tran = `mock_${payment}_${id.replace(/\W/g, "")}`;

  const post = (
    action: string | null,
    status: string,
    label: string,
    variant: "brand" | "outline" | "ghost",
  ) =>
    action ? (
      <form method="post" action={action}>
        <input type="hidden" name="value_a" value={payment} />
        <input type="hidden" name="amount" value={amount} />
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="tran_id" value={tran} />
        <Button type="submit" variant={variant} size="lg" className="w-full">
          {label}
        </Button>
      </form>
    ) : null;

  return (
    <div className="mx-auto grid w-full max-w-sm gap-5 rounded-(--radius-2xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-6">
      <div className="flex items-center gap-2 rounded-(--radius-lg) bg-highlight/20 px-3 py-2 text-sm text-highlight-foreground">
        <FlaskConical aria-hidden="true" className="size-4 shrink-0" />
        {t("pay.mockNote")}
      </div>
      <div className="grid justify-items-center gap-2 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <CreditCard aria-hidden="true" className="size-7" />
        </span>
        {product ? <p className="text-sm text-muted-foreground">{product}</p> : null}
        <p className="font-heading text-4xl font-bold tabular-nums">
          {fmt.money(amount / 100, { maximumFractionDigits: 0 })}
        </p>
      </div>
      <div className="grid gap-2">
        {post(success, "VALID", t("pay.mockPay"), "brand")}
        {post(fail, "FAILED", t("pay.mockFail"), "outline")}
        {post(cancel, "CANCELLED", t("pay.mockCancel"), "ghost")}
      </div>
    </div>
  );
}
