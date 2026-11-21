"use client";

import { Check, Eye, Pause, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { DISTRICTS } from "@/content/geo";
import { useT } from "@/i18n/client";
import {
  addFeatured,
  adminDocumentUrl,
  adminRefund,
  endFeatured,
  recordPayout,
  rejectProvider,
  resolveReport,
  suspendProvider,
  verifyProvider,
  type AdminResult,
} from "../server/actions";

function useAction() {
  const t = useT();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<AdminResult>, done?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(t("common.saved"));
        done?.();
      } else toast.error(t(r.error));
    });
  return { pending, run, t };
}

export function ReviewActions({ providerId, status }: { providerId: string; status: string }) {
  const { pending, run, t } = useAction();
  const [reason, setReason] = useState("");
  return (
    <div className="grid gap-3 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad)">
      {status !== "verified" ? (
        <Button disabled={pending} onClick={() => run(() => verifyProvider(providerId))}>
          <Check aria-hidden="true" />
          {t("admin.verify")}
        </Button>
      ) : null}
      <Label htmlFor="rv-reason">{t("admin.reason")}</Label>
      <Input
        id="rv-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("admin.reasonHint")}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={pending || reason.trim().length < 3}
          onClick={() => run(() => rejectProvider(providerId, reason))}
        >
          <X aria-hidden="true" />
          {t("admin.reject")}
        </Button>
        {status === "verified" ? (
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => run(() => suspendProvider(providerId, reason))}
          >
            <Pause aria-hidden="true" />
            {t("admin.suspend")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function DocumentButton({ documentId, label }: { documentId: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const url = await adminDocumentUrl(documentId);
          if (url) window.open(url, "_blank", "noopener");
        })
      }
    >
      <Eye aria-hidden="true" />
      {label}
    </Button>
  );
}

export function FeaturedForm({ vets }: { vets: { id: string; name: string; districtId: number | null }[] }) {
  const { pending, run, t } = useAction();
  const [providerId, setProviderId] = useState(vets[0]?.id ?? "");
  const [districtId, setDistrictId] = useState<string>("");
  const [days, setDays] = useState("7");
  return (
    <form
      className="grid gap-3 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad) sm:grid-cols-4 sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(() =>
          addFeatured({ providerId, districtId: districtId ? Number(districtId) : null, days: Number(days) }),
        );
      }}
    >
      <div className="grid gap-1 sm:col-span-2">
        <Label htmlFor="ff-vet">{t("admin.vet")}</Label>
        <NativeSelect id="ff-vet" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
          {vets.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="ff-district">{t("common.district")}</Label>
        <NativeSelect id="ff-district" value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
          <option value="">{t("common.all")}</option>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.en}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="ff-days">{t("admin.days")}</Label>
        <Input
          id="ff-days"
          type="number"
          min={1}
          max={90}
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending || !providerId} className="sm:col-span-4 sm:justify-self-start">
        {t("common.add")}
      </Button>
    </form>
  );
}

export function EndFeaturedButton({ id }: { id: string }) {
  const { pending, run, t } = useAction();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => endFeatured(id))}>
      {t("admin.end")}
    </Button>
  );
}

export function PayoutForm({ providerId, max }: { providerId: string; max: number }) {
  const { pending, run, t } = useAction();
  const [amount, setAmount] = useState(String(Math.floor(max / 100)));
  const [method, setMethod] = useState<"bkash" | "nagad" | "bank">("bkash");
  const [reference, setReference] = useState("");
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => recordPayout({ providerId, amount: Math.round(Number(amount) * 100), method, reference }));
      }}
    >
      <Input
        aria-label={t("common.amount")}
        type="number"
        min={1}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-28"
      />
      <NativeSelect
        aria-label={t("admin.method")}
        value={method}
        onChange={(e) => setMethod(e.target.value as typeof method)}
      >
        <option value="bkash">bKash</option>
        <option value="nagad">Nagad</option>
        <option value="bank">Bank</option>
      </NativeSelect>
      <Input
        aria-label={t("admin.reference")}
        placeholder={t("admin.reference")}
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        className="w-40"
      />
      <Button type="submit" size="sm" disabled={pending || reference.trim().length < 3}>
        {t("admin.markPaid")}
      </Button>
    </form>
  );
}

export function RefundButton({ consultId }: { consultId: string }) {
  const { pending, run, t } = useAction();
  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (window.confirm(t("admin.refundConfirm"))) run(() => adminRefund(consultId, "admin"));
      }}
    >
      {t("admin.refund")}
    </Button>
  );
}

export function ReportActions({ id }: { id: string }) {
  const { pending, run, t } = useAction();
  return (
    <div className="flex gap-2">
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => run(() => resolveReport(id, true))}
      >
        {t("admin.hide")}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => run(() => resolveReport(id, false))}
      >
        {t("admin.dismiss")}
      </Button>
    </div>
  );
}
