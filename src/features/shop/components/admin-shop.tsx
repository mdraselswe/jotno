"use client";

import { Ban, Check, PackageCheck, Printer, RotateCcw, Save, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SPECIES } from "@/content/geo";
import { SHOP_CATEGORIES } from "@/content/shop";
import { ImageUpload } from "@/features/uploads";
import { useLocale, useT } from "@/i18n/client";
import { toPoisha } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  changeStock,
  saveCoupon,
  saveOrderNote,
  saveProduct,
  updateOrder,
  type ShopResult,
} from "../server/actions";
import { orderActions, type OrderAction, type OrderStatus } from "../status";

function useRun() {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ShopResult>, done?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(t("common.saved"));
        done?.();
        router.refresh();
      } else toast.error(t(r.error));
    });
  return { t, pending, run };
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Admin: the next steps for an order (confirm, ship with courier + tracking, deliver, cancel, return). */
export function OrderControls({ id, status, cod }: { id: string; status: OrderStatus; cod: boolean }) {
  const locale = useLocale();
  const { t, pending, run } = useRun();
  const actions = orderActions(status);
  const [open, setOpen] = useState<OrderAction | null>(null);
  const [ship, setShip] = useState({ courier: "", trackingCode: "", trackingUrl: "" });
  const [reason, setReason] = useState("");
  const go = (action: OrderAction, data?: Parameters<typeof updateOrder>[3]) =>
    run(
      () => updateOrder(locale, id, action, data),
      () => setOpen(null),
    );

  if (actions.length === 0) return null;
  const label: Record<OrderAction, string> = {
    process: t("shopAdmin.process"),
    ship: t("shopAdmin.ship"),
    deliver: cod ? t("shopAdmin.deliverCod") : t("shopAdmin.deliver"),
    cancel: t("shopAdmin.cancel"),
    return: t("shopAdmin.return"),
  };
  const icon: Record<OrderAction, ReactNode> = {
    process: <PackageCheck aria-hidden="true" />,
    ship: <Truck aria-hidden="true" />,
    deliver: <Check aria-hidden="true" />,
    cancel: <Ban aria-hidden="true" />,
    return: <RotateCcw aria-hidden="true" />,
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a}
            size="sm"
            variant={a === "cancel" || a === "return" ? "outline" : "default"}
            disabled={pending}
            aria-expanded={a === "ship" || a === "cancel" || a === "return" ? open === a : undefined}
            onClick={() => {
              if (a === "process" || a === "deliver") go(a);
              else setOpen(open === a ? null : a);
            }}
          >
            {icon[a]}
            {label[a]}
          </Button>
        ))}
      </div>
      {open === "ship" ? (
        <form
          className="grid gap-3 rounded-(--radius-lg) bg-muted/50 p-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            go("ship", ship);
          }}
        >
          <Field id="sh-courier" label={t("shopAdmin.courier")}>
            <Input
              id="sh-courier"
              list="sh-couriers"
              placeholder={t("shopAdmin.courierHint")}
              value={ship.courier}
              onChange={(e) => setShip({ ...ship, courier: e.target.value })}
            />
            <datalist id="sh-couriers">
              {["Steadfast", "Pathao", "RedX", "Sundarban", "SA Paribahan", "eCourier"].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field id="sh-code" label={t("shopAdmin.tracking")}>
            <Input
              id="sh-code"
              value={ship.trackingCode}
              onChange={(e) => setShip({ ...ship, trackingCode: e.target.value })}
            />
          </Field>
          <Field id="sh-url" label={t("shopAdmin.trackingUrl")}>
            <Input
              id="sh-url"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={ship.trackingUrl}
              onChange={(e) => setShip({ ...ship, trackingUrl: e.target.value })}
            />
          </Field>
          <Button
            type="submit"
            disabled={pending || ship.courier.trim().length < 2}
            className="sm:col-span-3 sm:justify-self-start"
          >
            <Truck aria-hidden="true" />
            {t("shopAdmin.ship")}
          </Button>
        </form>
      ) : null}
      {open === "cancel" || open === "return" ? (
        <form
          className="grid gap-2 rounded-(--radius-lg) bg-muted/50 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            go(open, { reason });
          }}
        >
          <Label htmlFor="oc-reason">{t("shopAdmin.reason")}</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="oc-reason"
              className="min-w-0 flex-1"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button type="submit" variant="destructive" disabled={pending || reason.trim().length < 3}>
              {label[open]}
            </Button>
          </div>
          {open === "cancel" ? (
            <p className="text-xs text-muted-foreground">{t("shop.cancelConfirm")}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

/** Admin: a private team note on an order. */
export function OrderNote({ id, initial }: { id: string; initial: string }) {
  const { t, pending, run } = useRun();
  const [note, setNote] = useState(initial);
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveOrderNote(id, note));
      }}
    >
      <Label htmlFor="o-note">{t("shopAdmin.note")}</Label>
      <Textarea id="o-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending} className="justify-self-start">
        <Save aria-hidden="true" />
        {t("shopAdmin.saveNote")}
      </Button>
    </form>
  );
}

export function PrintButton({ label }: { label: string }) {
  return (
    <Button size="sm" variant="outline" onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden="true" />
      {label}
    </Button>
  );
}

/** Admin: stock arrived (+) or a count correction (−); logged in the stock history. */
export function StockAdjust({ productId }: { productId: string }) {
  const { t, pending, run } = useRun();
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const n = Number(delta);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => changeStock(productId, n, note),
          () => {
            setDelta("");
            setNote("");
          },
        );
      }}
    >
      <Field id="st-delta" label={t("shopAdmin.adjust")} hint={t("shopAdmin.adjustHint")}>
        <Input
          id="st-delta"
          inputMode="numeric"
          placeholder="+10"
          value={delta}
          onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ""))}
        />
      </Field>
      <Field id="st-note" label={t("shopAdmin.adjustNote")}>
        <Input id="st-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button type="submit" disabled={pending || !Number.isInteger(n) || n === 0}>
        <Save aria-hidden="true" />
        {t("common.save")}
      </Button>
    </form>
  );
}

export interface CouponFormValues {
  code: string;
  kind: "percent" | "flat";
  /** Percent (e.g. "10") or taka. */
  value: string;
  minSubtotal: string;
  maxDiscount: string;
  maxUses: string;
  endsAt: string;
  active: boolean;
}

export const EMPTY_COUPON: CouponFormValues = {
  code: "",
  kind: "percent",
  value: "10",
  minSubtotal: "0",
  maxDiscount: "",
  maxUses: "",
  endsAt: "",
  active: true,
};

/** Admin: create or edit a discount code. */
export function CouponForm({ id, initial }: { id: string | null; initial: CouponFormValues }) {
  const { t, pending, run } = useRun();
  const [v, setV] = useState(initial);
  const set = (patch: Partial<CouponFormValues>) => setV((x) => ({ ...x, ...patch }));
  const p = (key: string) => `cp-${id ?? "new"}-${key}`;
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            saveCoupon(id, {
              code: v.code,
              kind: v.kind,
              value: v.kind === "percent" ? Math.round(Number(v.value) * 100) : (toPoisha(v.value) ?? 0),
              minSubtotal: toPoisha(v.minSubtotal || "0") ?? 0,
              maxDiscount: v.maxDiscount ? toPoisha(v.maxDiscount) : null,
              maxUses: v.maxUses ? Number(v.maxUses) : null,
              endsAt: v.endsAt || null,
              active: v.active,
            }),
          () => {
            if (!id) setV(EMPTY_COUPON);
          },
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={p("code")} label={t("shopAdmin.code")}>
          <Input
            id={p("code")}
            className="font-mono uppercase"
            value={v.code}
            onChange={(e) => set({ code: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field id={p("kind")} label={t("shopAdmin.kind")}>
          <NativeSelect
            id={p("kind")}
            value={v.kind}
            onChange={(e) => set({ kind: e.target.value === "flat" ? "flat" : "percent" })}
          >
            <option value="percent">{t("shopAdmin.percent")}</option>
            <option value="flat">{t("shopAdmin.flat")}</option>
          </NativeSelect>
        </Field>
        <Field id={p("value")} label={t("shopAdmin.value")}>
          <Input
            id={p("value")}
            inputMode="decimal"
            value={v.value}
            onChange={(e) => set({ value: e.target.value })}
          />
        </Field>
        <Field id={p("min")} label={t("shopAdmin.minSubtotal")}>
          <Input
            id={p("min")}
            inputMode="numeric"
            value={v.minSubtotal}
            onChange={(e) => set({ minSubtotal: e.target.value })}
          />
        </Field>
        <Field id={p("max")} label={t("shopAdmin.maxDiscount")}>
          <Input
            id={p("max")}
            inputMode="numeric"
            value={v.maxDiscount}
            onChange={(e) => set({ maxDiscount: e.target.value })}
          />
        </Field>
        <Field id={p("uses")} label={t("shopAdmin.maxUses")}>
          <Input
            id={p("uses")}
            inputMode="numeric"
            value={v.maxUses}
            onChange={(e) => set({ maxUses: e.target.value })}
          />
        </Field>
        <Field id={p("ends")} label={t("shopAdmin.endsAt")}>
          <Input
            id={p("ends")}
            type="date"
            value={v.endsAt}
            onChange={(e) => set({ endsAt: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={v.active} onCheckedChange={(checked) => set({ active: checked })} />
          {t("shopAdmin.active")}
        </label>
        <Button type="submit" disabled={pending || v.code.trim().length < 3} className="ml-auto">
          <Save aria-hidden="true" />
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}

export interface ProductFormValues {
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  category: string;
  speciesId: string;
  price: string;
  compareAt: string;
  stock: string;
  lowStockAt: string;
  sku: string;
  unit: string;
  imagePath: string | null;
  active: boolean;
}

export const EMPTY_PRODUCT: ProductFormValues = {
  nameEn: "",
  nameBn: "",
  descriptionEn: "",
  descriptionBn: "",
  category: "food",
  speciesId: "",
  price: "",
  compareAt: "",
  stock: "0",
  lowStockAt: "5",
  sku: "",
  unit: "",
  imagePath: null,
  active: true,
};

/** Admin: create or edit a product (prices in taka). Stock is set here only for a new product. */
export function ProductForm({ id, initial }: { id: string | null; initial: ProductFormValues }) {
  const locale = useLocale();
  const { t, pending, run } = useRun();
  const [v, setV] = useState(initial);
  const set = (patch: Partial<ProductFormValues>) => setV((x) => ({ ...x, ...patch }));
  const text = (
    key: "nameEn" | "nameBn" | "price" | "compareAt" | "stock" | "lowStockAt" | "sku" | "unit",
    label: string,
    opts: { numeric?: boolean; hint?: string } = {},
  ) => (
    <Field id={`pf-${key}`} label={label} hint={opts.hint}>
      <Input
        id={`pf-${key}`}
        inputMode={opts.numeric ? "decimal" : undefined}
        value={v[key]}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </Field>
  );
  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() =>
          saveProduct(locale, id, {
            nameEn: v.nameEn,
            nameBn: v.nameBn,
            descriptionEn: v.descriptionEn,
            descriptionBn: v.descriptionBn,
            category: v.category,
            speciesId: v.speciesId ? Number(v.speciesId) : null,
            price: toPoisha(v.price) ?? 0,
            compareAt: v.compareAt ? (toPoisha(v.compareAt) ?? null) : null,
            stock: Number(v.stock) || 0,
            lowStockAt: Number(v.lowStockAt) || 0,
            sku: v.sku,
            unit: v.unit,
            imagePath: v.imagePath,
            active: v.active,
          }),
        );
      }}
    >
      <ImageUpload
        kind="product"
        value={v.imagePath}
        onChange={(path) => set({ imagePath: path })}
        label={t("shop.image")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {text("nameEn", "Name (English)")}
        {text("nameBn", "নাম (বাংলা)")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pf-category" label={t("shop.category")}>
          <NativeSelect
            id="pf-category"
            value={v.category}
            onChange={(e) => set({ category: e.target.value })}
          >
            {SHOP_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {locale === "bn" ? c.bn : c.en}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="pf-species" label={t("common.species")}>
          <NativeSelect
            id="pf-species"
            value={v.speciesId}
            onChange={(e) => set({ speciesId: e.target.value })}
          >
            <option value="">{t("common.all")}</option>
            {SPECIES.map((s) => (
              <option key={s.id} value={s.id}>
                {locale === "bn" ? s.bn : s.en}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {text("price", t("shop.price"), { numeric: true })}
        {text("compareAt", t("shop.compareAt"), { numeric: true })}
        {text("unit", t("shopAdmin.unit"), { hint: t("shopAdmin.unitHint") })}
      </div>
      <div className={cn("grid gap-4", id ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
        {id ? null : text("stock", t("shopAdmin.openingStock"), { numeric: true })}
        {text("lowStockAt", t("shopAdmin.lowStockAt"), { numeric: true })}
        {text("sku", t("shopAdmin.sku"))}
      </div>
      <Field id="pf-den" label="Description (English)">
        <Textarea
          id="pf-den"
          value={v.descriptionEn}
          onChange={(e) => set({ descriptionEn: e.target.value })}
          rows={3}
        />
      </Field>
      <Field id="pf-dbn" label="বিবরণ (বাংলা)">
        <Textarea
          id="pf-dbn"
          value={v.descriptionBn}
          onChange={(e) => set({ descriptionBn: e.target.value })}
          rows={3}
        />
      </Field>
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={v.active} onCheckedChange={(checked) => set({ active: checked })} />
        {t("shop.active")}
      </label>
      <Button type="submit" disabled={pending} className="justify-self-start">
        <Save aria-hidden="true" />
        {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}
