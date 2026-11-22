"use client";

import { Check, Send, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale, useT } from "@/i18n/client";
import { approvePayment, markRefundSent, rejectPayment, type PayResult } from "../server/manual";

function useRun() {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  const run = (fn: (locale: string) => Promise<PayResult>, done?: () => void) =>
    start(async () => {
      const r = await fn(locale);
      if (r.ok) {
        toast.success(t("common.saved"));
        done?.();
      } else toast.error(t(r.error));
    });
  return { t, pending, run };
}

/** Admin: approve a TrxID found in the wallet, or send it back with a reason. */
export function ReviewPayment({ id }: { id: string }) {
  const { t, pending, run } = useRun();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => run((l) => approvePayment(l, id))}>
          <Check aria-hidden="true" />
          {t("payAdmin.approve")}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting((v) => !v)}>
          <X aria-hidden="true" />
          {t("payAdmin.reject")}
        </Button>
      </div>
      {rejecting ? (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run((l) => rejectPayment(l, id, reason));
          }}
        >
          <Label htmlFor={`rj-${id}`}>{t("payAdmin.rejectReason")}</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id={`rj-${id}`}
              className="min-w-0 flex-1"
              value={reason}
              placeholder={t("payAdmin.rejectHint")}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={pending || reason.trim().length < 3}
            >
              {t("payAdmin.reject")}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

/** Admin: the refund was sent from the wallet; record its TrxID. */
export function RefundSent({ id }: { id: string }) {
  const { t, pending, run } = useRun();
  const [ref, setRef] = useState("");
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run((l) => markRefundSent(l, id, ref));
      }}
    >
      <div className="grid min-w-0 flex-1 gap-1">
        <Label htmlFor={`rf-${id}`} className="text-xs">
          {t("payAdmin.refundRef")}
        </Label>
        <Input
          id={`rf-${id}`}
          className="font-mono uppercase"
          value={ref}
          onChange={(e) => setRef(e.target.value.toUpperCase())}
        />
      </div>
      <Button type="submit" size="sm" disabled={pending || ref.trim().length < 4}>
        <Send aria-hidden="true" />
        {t("payAdmin.refundSent")}
      </Button>
    </form>
  );
}
