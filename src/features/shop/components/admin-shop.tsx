"use client";

import { useState, useTransition } from "react";
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
import { saveProduct, setOrderStatus, type ShopResult } from "../server/actions";

function useRun() {
  const t = useT();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ShopResult>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(t("common.saved"));
      else toast.error(t(r.error));
    });
  return { t, pending, run };
}

/** Admin: ship / deliver / cancel an order. */
export function OrderActions({ id, status }: { id: string; status: string }) {
  const locale = useLocale();
  const { t, pending, run } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      {status === "paid" ? (
        <Button size="sm" disabled={pending} onClick={() => run(() => setOrderStatus(locale, id, "shipped"))}>
          {t("shop.markShipped")}
        </Button>
      ) : null}
      {status === "shipped" ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(() => setOrderStatus(locale, id, "delivered"))}
        >
          {t("shop.markDelivered")}
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (window.confirm(t("shop.cancelConfirm"))) run(() => setOrderStatus(locale, id, "cancelled"));
        }}
      >
        {t("common.cancel")}
      </Button>
    </div>
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
  imagePath: null,
  active: true,
};

/** Admin: create or edit a product (prices in taka). */
export function ProductForm({ id, initial }: { id: string | null; initial: ProductFormValues }) {
  const locale = useLocale();
  const { t, pending, run } = useRun();
  const [v, setV] = useState(initial);
  const set = (patch: Partial<ProductFormValues>) => setV((x) => ({ ...x, ...patch }));
  const field = (
    key: "nameEn" | "nameBn" | "price" | "compareAt" | "stock",
    label: string,
    type = "text",
  ) => (
    <div className="grid gap-1">
      <Label htmlFor={`pf-${key}`}>{label}</Label>
      <Input id={`pf-${key}`} type={type} value={v[key]} onChange={(e) => set({ [key]: e.target.value })} />
    </div>
  );
  return (
    <form
      className="grid gap-4"
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
            imagePath: v.imagePath,
            active: v.active,
          }),
        );
      }}
    >
      <ImageUpload
        kind="product"
        value={v.imagePath}
        onChange={(p) => set({ imagePath: p })}
        label={t("shop.image")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {field("nameEn", "Name (English)")}
        {field("nameBn", "নাম (বাংলা)")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="pf-category">{t("shop.category")}</Label>
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
        </div>
        <div className="grid gap-1">
          <Label htmlFor="pf-species">{t("common.species")}</Label>
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
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {field("price", t("shop.price"), "number")}
        {field("compareAt", t("shop.compareAt"), "number")}
        {field("stock", t("shop.stock"), "number")}
      </div>
      <div className="grid gap-1">
        <Label htmlFor="pf-den">Description (English)</Label>
        <Textarea
          id="pf-den"
          value={v.descriptionEn}
          onChange={(e) => set({ descriptionEn: e.target.value })}
          rows={3}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="pf-dbn">বিবরণ (বাংলা)</Label>
        <Textarea
          id="pf-dbn"
          value={v.descriptionBn}
          onChange={(e) => set({ descriptionBn: e.target.value })}
          rows={3}
        />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={v.active} onCheckedChange={(checked) => set({ active: checked })} />
        {t("shop.active")}
      </label>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}
