"use client";

import {
  Ban,
  Check,
  Eye,
  ImageIcon,
  Loader2,
  PackageCheck,
  Printer,
  RotateCcw,
  Save,
  Tag,
  TextCursorInput,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { SectionCard } from "@/components/layout/app-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SPECIES } from "@/content/geo";
import { ImageListUpload, ImageUpload } from "@/features/uploads";
import { useLocale, useT } from "@/i18n/client";
import { toPoisha } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  changeStock,
  deleteProduct,
  saveCoupon,
  saveOrderNote,
  saveProduct,
  updateOrder,
  type ShopResult,
} from "../server/actions";
import type { ShopCategoryRef } from "../catalog";
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
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const Spin = () => <Loader2 aria-hidden="true" className="animate-spin" />;

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

  if (actions.length === 0)
    return <p className="text-sm text-muted-foreground">{t("shopui.admin.noActions")}</p>;
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
    deliver: cod ? <Wallet aria-hidden="true" /> : <Check aria-hidden="true" />,
    cancel: <Ban aria-hidden="true" />,
    return: <RotateCcw aria-hidden="true" />,
  };
  const forward = actions.filter((a) => a !== "cancel" && a !== "return");
  const back = actions.filter((a) => a === "cancel" || a === "return");
  const press = (a: OrderAction) => {
    if (a === "process" || a === "deliver") go(a);
    else setOpen(open === a ? null : a);
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {forward.map((a) => (
          <Button
            key={a}
            variant="brand"
            disabled={pending}
            aria-expanded={a === "ship" ? open === a : undefined}
            onClick={() => press(a)}
            className="max-sm:flex-1"
          >
            {pending && (a === "process" || a === "deliver") ? <Spin /> : icon[a]}
            {label[a]}
          </Button>
        ))}
        {back.map((a) => (
          <Button
            key={a}
            variant="outline"
            disabled={pending}
            aria-expanded={open === a}
            onClick={() => press(a)}
            className="sm:ms-auto"
          >
            {icon[a]}
            {label[a]}
          </Button>
        ))}
      </div>
      {open === "ship" ? (
        <form
          className="grid gap-3 rounded-(--radius-xl) bg-muted/50 p-3 sm:grid-cols-3 sm:p-4"
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
              className="font-mono"
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
            variant="brand"
            disabled={pending || ship.courier.trim().length < 2}
            className="sm:col-span-3 sm:justify-self-start"
          >
            {pending ? <Spin /> : <Truck aria-hidden="true" />}
            {t("shopAdmin.ship")}
          </Button>
        </form>
      ) : null}
      {open === "cancel" || open === "return" ? (
        <form
          className="grid gap-2 rounded-(--radius-xl) bg-destructive/6 p-3 ring-1 ring-destructive/15 sm:p-4"
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
              {pending ? <Spin /> : icon[open]}
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
      <Label htmlFor="o-note" className="sr-only">
        {t("shopAdmin.note")}
      </Label>
      <Textarea
        id="o-note"
        rows={3}
        value={note}
        placeholder={t("shopui.admin.notePlaceholder")}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending || note === initial}
        className="justify-self-start"
      >
        {pending ? <Spin /> : <Save aria-hidden="true" />}
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
  const valid = delta !== "" && delta !== "-" && Number.isInteger(n) && n !== 0;
  return (
    <form
      className="grid gap-3 sm:grid-cols-[9rem_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        run(
          () => changeStock(productId, n, note),
          () => {
            setDelta("");
            setNote("");
          },
        );
      }}
    >
      <Field id="st-delta" label={t("shopAdmin.adjust")}>
        <Input
          id="st-delta"
          inputMode="numeric"
          placeholder="+10"
          className="font-mono"
          value={delta}
          aria-describedby="st-help"
          onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ""))}
        />
      </Field>
      <Field id="st-note" label={t("shopAdmin.adjustNote")}>
        <Input id="st-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button type="submit" disabled={pending || !valid}>
        {pending ? <Spin /> : <Save aria-hidden="true" />}
        {t("common.save")}
      </Button>
      <p id="st-help" className="text-xs text-muted-foreground sm:col-span-3">
        {t("shopAdmin.adjustHint")}
      </p>
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
  const num = Number(v.value);
  const valueError =
    v.value.trim() === ""
      ? null
      : !Number.isFinite(num) || num <= 0
        ? t("shopui.admin.err.value")
        : v.kind === "percent" && num > 100
          ? t("shopui.admin.err.percent")
          : null;
  const codeOk = /^[A-Z0-9-]{3,20}$/.test(v.code.trim());
  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            saveCoupon(id, {
              code: v.code,
              kind: v.kind,
              value: v.kind === "percent" ? Math.round(Number(v.value) * 100) : (toPoisha(v.value) ?? 0),
              minSubtotal: toPoisha(v.minSubtotal || "0") ?? 0,
              // The cap is for percent codes only (a flat code is its own cap).
              maxDiscount: v.kind === "percent" && v.maxDiscount ? toPoisha(v.maxDiscount) : null,
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
        <Field id={p("code")} label={t("shopAdmin.code")} hint={t("shopui.admin.codeHint")}>
          <Input
            id={p("code")}
            className="font-mono uppercase"
            maxLength={20}
            value={v.code}
            aria-describedby={`${p("code")}-hint`}
            onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })}
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
        <Field
          id={p("value")}
          label={`${t("shopAdmin.value")} (${v.kind === "percent" ? "%" : "৳"})`}
          error={valueError}
        >
          <Input
            id={p("value")}
            inputMode="decimal"
            value={v.value}
            aria-invalid={valueError ? true : undefined}
            aria-describedby={valueError ? `${p("value")}-err` : undefined}
            onChange={(e) => set({ value: e.target.value })}
          />
        </Field>
      </div>
      <fieldset className="grid gap-4 rounded-(--radius-xl) bg-muted/40 p-3 sm:grid-cols-4 sm:p-4">
        <legend className="float-left mb-1 w-full text-xs font-semibold text-muted-foreground sm:col-span-4">
          {t("shopui.admin.limits")}
        </legend>
        <Field id={p("min")} label={`${t("shopAdmin.minSubtotal")} (৳)`}>
          <Input
            id={p("min")}
            inputMode="numeric"
            value={v.minSubtotal}
            onChange={(e) => set({ minSubtotal: e.target.value })}
          />
        </Field>
        <Field id={p("max")} label={`${t("shopAdmin.maxDiscount")} (৳)`}>
          <Input
            id={p("max")}
            inputMode="numeric"
            value={v.maxDiscount}
            disabled={v.kind === "flat"}
            onChange={(e) => set({ maxDiscount: e.target.value })}
          />
        </Field>
        <Field id={p("uses")} label={t("shopAdmin.maxUses")}>
          <Input
            id={p("uses")}
            inputMode="numeric"
            value={v.maxUses}
            placeholder="∞"
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
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-3 text-sm font-medium">
          <Switch checked={v.active} onCheckedChange={(checked) => set({ active: checked })} />
          {t("shopAdmin.active")}
        </label>
        <Button
          type="submit"
          variant={id ? "default" : "brand"}
          disabled={pending || !codeOk || Boolean(valueError) || v.value.trim() === ""}
          className="ms-auto"
        >
          {pending ? <Spin /> : <Save aria-hidden="true" />}
          {id ? t("common.save") : t("shopui.admin.createCoupon")}
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
  images: string[];
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
  images: [],
  active: true,
};

/** Admin: create or edit a product (prices in taka). Stock is set here only for a new product. */
export function ProductForm({
  id,
  initial,
  categories,
  galleryMax,
}: {
  id: string | null;
  initial: ProductFormValues;
  categories: ShopCategoryRef[];
  galleryMax: number;
}) {
  const locale = useLocale();
  const { t, pending, run } = useRun();
  // A new product starts in the first category that exists.
  const [v, setV] = useState(() =>
    id || categories.some((c) => c.slug === initial.category)
      ? initial
      : { ...initial, category: categories[0]?.slug ?? initial.category },
  );
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<ProductFormValues>) => setV((x) => ({ ...x, ...patch }));
  const price = toPoisha(v.price);
  const compareAt = v.compareAt ? toPoisha(v.compareAt) : null;
  const errors = {
    nameEn: v.nameEn.trim().length < 2 ? t("shopui.admin.err.name") : null,
    nameBn: v.nameBn.trim().length < 2 ? t("shopui.admin.err.name") : null,
    price: price === null || price < 100 ? t("shopui.admin.err.price") : null,
  };
  const saleHint =
    compareAt !== null && price !== null && compareAt > 0 && compareAt <= price
      ? t("shopui.admin.compareHint")
      : null;
  const show = (k: keyof typeof errors) => (tried ? errors[k] : null);
  const text = (
    key: "nameEn" | "nameBn" | "price" | "compareAt" | "stock" | "lowStockAt" | "sku" | "unit",
    label: string,
    opts: { numeric?: boolean; hint?: string; error?: string | null; className?: string } = {},
  ) => (
    <Field id={`pf-${key}`} label={label} hint={opts.hint} error={opts.error}>
      <Input
        id={`pf-${key}`}
        inputMode={opts.numeric ? "decimal" : undefined}
        value={v[key]}
        className={opts.className}
        aria-invalid={opts.error ? true : undefined}
        aria-describedby={opts.error ? `pf-${key}-err` : opts.hint ? `pf-${key}-hint` : undefined}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </Field>
  );
  return (
    <form
      className="grid gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (errors.nameEn || errors.nameBn || errors.price) {
          toast.error(t("shop.productInvalid"));
          return;
        }
        run(() =>
          saveProduct(locale, id, {
            nameEn: v.nameEn,
            nameBn: v.nameBn,
            descriptionEn: v.descriptionEn,
            descriptionBn: v.descriptionBn,
            category: v.category,
            speciesId: v.speciesId ? Number(v.speciesId) : null,
            price: price ?? 0,
            compareAt: compareAt ?? null,
            stock: Number(v.stock) || 0,
            lowStockAt: Number(v.lowStockAt) || 0,
            sku: v.sku,
            unit: v.unit,
            imagePath: v.imagePath,
            images: v.images,
            active: v.active,
          }),
        );
      }}
    >
      <SectionCard
        title={t("shopui.admin.photos")}
        description={t("shopui.admin.photosSub")}
        icon={ImageIcon}
      >
        <div className="grid gap-5">
          <ImageUpload
            kind="product"
            value={v.imagePath}
            onChange={(path) => set({ imagePath: path })}
            label={t("shop.image")}
          />
          <ImageListUpload
            kind="product"
            value={v.images}
            onChange={(images) => set({ images })}
            max={galleryMax}
            label={t("shopAdmin.morePhotos", { max: galleryMax })}
            hint={t("shopAdmin.morePhotosHint")}
          />
        </div>
      </SectionCard>

      <SectionCard title={t("shopui.admin.basics")} icon={TextCursorInput}>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {text("nameEn", "Name (English)", { error: show("nameEn") })}
            {text("nameBn", "নাম (বাংলা)", { error: show("nameBn") })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pf-category" label={t("shop.category")}>
              <NativeSelect
                id="pf-category"
                value={v.category}
                onChange={(e) => set({ category: e.target.value })}
              >
                {categories.some((c) => c.slug === v.category) ? null : (
                  <option value={v.category}>{v.category}</option>
                )}
                {categories.map((c) => (
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
          <Field id="pf-den" label="Description (English)">
            <Textarea
              id="pf-den"
              value={v.descriptionEn}
              maxLength={2000}
              onChange={(e) => set({ descriptionEn: e.target.value })}
              rows={4}
            />
          </Field>
          <Field id="pf-dbn" label="বিবরণ (বাংলা)">
            <Textarea
              id="pf-dbn"
              value={v.descriptionBn}
              maxLength={2000}
              onChange={(e) => set({ descriptionBn: e.target.value })}
              rows={4}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={t("shopui.admin.priceStock")} icon={Tag}>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {text("price", t("shop.price"), { numeric: true, error: show("price") })}
            {text("compareAt", t("shop.compareAt"), {
              numeric: true,
              hint: saleHint ?? t("shopui.admin.compareSub"),
            })}
            {text("unit", t("shopAdmin.unit"), { hint: t("shopAdmin.unitHint") })}
          </div>
          <div className={cn("grid gap-4", id ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
            {id ? null : text("stock", t("shopAdmin.openingStock"), { numeric: true })}
            {text("lowStockAt", t("shopAdmin.lowStockAt"), { numeric: true })}
            {text("sku", t("shopAdmin.sku"), { className: "font-mono" })}
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t("shopui.admin.visibility")} icon={Eye}>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span className="grid gap-0.5">
            <span className="font-medium">{t("shop.active")}</span>
            <span className="text-xs text-muted-foreground">{t("shopui.admin.activeSub")}</span>
          </span>
          <Switch checked={v.active} onCheckedChange={(checked) => set({ active: checked })} />
        </label>
      </SectionCard>

      {/* Save: sticky at the bottom on phones (above the tab bar), at the end from md. */}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button type="submit" variant="brand" size="lg" disabled={pending} className="w-full md:w-auto">
          {pending ? <Spin /> : <Save aria-hidden="true" />}
          {pending ? t("common.saving") : id ? t("common.save") : t("shopui.admin.createProduct")}
        </Button>
      </div>
    </form>
  );
}

/** Admin: delete a product that was never ordered (otherwise turn it off). */
export function DeleteProductButton({ id }: { id: string }) {
  const locale = useLocale();
  const { t, pending, run } = useRun();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      className="text-destructive hover:text-destructive"
      onClick={() => {
        if (window.confirm(t("shopAdmin.deleteConfirm"))) run(() => deleteProduct(locale, id));
      }}
    >
      {pending ? <Spin /> : <Trash2 aria-hidden="true" />}
      {t("shopAdmin.delete")}
    </Button>
  );
}
