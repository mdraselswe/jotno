"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/i18n/client";
import { deleteCategory, saveCategory, type ShopResult } from "../server/actions";

export interface CategoryRow {
  slug: string;
  en: string;
  bn: string;
  sort: number;
  active: boolean;
  products: number;
}

/** Admin: one category (`row` null = a new one). */
export function CategoryForm({ row, nextSort }: { row: CategoryRow | null; nextSort?: number }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState({
    slug: row?.slug ?? "",
    nameEn: row?.en ?? "",
    nameBn: row?.bn ?? "",
    sort: String(row?.sort ?? nextSort ?? 0),
    active: row?.active ?? true,
  });
  const key = row?.slug ?? "new";
  const run = (fn: () => Promise<ShopResult>, done?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(t("common.saved"));
        done?.();
        router.refresh();
      } else toast.error(t(r.error));
    });

  return (
    <form
      className="grid gap-3 sm:grid-cols-[8rem_1fr_1fr_5rem_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            saveCategory(row === null, {
              slug: v.slug,
              nameEn: v.nameEn,
              nameBn: v.nameBn,
              sort: Number(v.sort) || 0,
              active: v.active,
            }),
          () => {
            if (row === null)
              setV({ slug: "", nameEn: "", nameBn: "", sort: String((nextSort ?? 0) + 10), active: true });
          },
        );
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`cat-slug-${key}`}>{t("shopAdmin.slug")}</Label>
        <Input
          id={`cat-slug-${key}`}
          value={v.slug}
          disabled={row !== null}
          placeholder="treats"
          onChange={(e) => setV({ ...v, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`cat-en-${key}`}>Name (English)</Label>
        <Input
          id={`cat-en-${key}`}
          value={v.nameEn}
          onChange={(e) => setV({ ...v, nameEn: e.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`cat-bn-${key}`}>নাম (বাংলা)</Label>
        <Input
          id={`cat-bn-${key}`}
          value={v.nameBn}
          onChange={(e) => setV({ ...v, nameBn: e.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`cat-sort-${key}`}>{t("shopAdmin.sortOrder")}</Label>
        <Input
          id={`cat-sort-${key}`}
          inputMode="numeric"
          value={v.sort}
          onChange={(e) => setV({ ...v, sort: e.target.value })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={v.active} onCheckedChange={(active) => setV({ ...v, active })} />
          {t("shop.active")}
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          {row ? <Save aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {row ? t("common.save") : t("shopAdmin.addCategory")}
        </Button>
        {row && row.products === 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            aria-label={t("shopAdmin.deleteCategory", { name: row.en })}
            onClick={() => run(() => deleteCategory(row.slug))}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </form>
  );
}
