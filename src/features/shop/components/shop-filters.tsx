"use client";

import { SlidersHorizontal, X } from "lucide-react";
import type { Route } from "next";
import Form from "next/form";
import { useState, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export const SHOP_FORM_ID = "shop-filters";

/**
 * The shop's one filter form (GET, so every filter is in the address and the
 * page works without JavaScript). With JavaScript it applies a filter as soon
 * as it changes and navigates on the client, keeping the scroll position.
 * The search box and the sort menu join it from elsewhere on the page with
 * `form={SHOP_FORM_ID}`.
 */
export function ShopFilterForm({ action, children }: { action: Route; children: ReactNode }) {
  return (
    <Form
      id={SHOP_FORM_ID}
      action={action}
      scroll={false}
      onChange={(e) => {
        const el = e.target as HTMLElement;
        // Typed fields apply on Enter / blur ("change"), boxes apply at once.
        if (el instanceof HTMLInputElement && (el.type === "search" || el.type === "text")) return;
        e.currentTarget.requestSubmit();
      }}
      onSubmit={(e) => {
        // Leave empty fields out of the address (?min=&max= …).
        const empty = Array.from(e.currentTarget.elements).filter(
          (el): el is HTMLInputElement | HTMLSelectElement =>
            (el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && el.type !== "checkbox")) &&
            el.value.trim() === "",
        );
        for (const el of empty) el.disabled = true;
        window.setTimeout(() => {
          for (const el of empty) el.disabled = false;
        }, 0);
      }}
    >
      {children}
    </Form>
  );
}

/** Sort menu, outside the filter panel but part of its form. */
export function SortSelect({
  value,
  options,
  label,
}: {
  value: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground max-sm:sr-only">{label}</span>
      <select
        name="sort"
        form={SHOP_FORM_ID}
        defaultValue={value}
        key={value}
        onChange={(e) => {
          const form = document.getElementById(SHOP_FORM_ID);
          if (form instanceof HTMLFormElement) form.requestSubmit();
          else e.currentTarget.form?.submit();
        }}
        className="h-(--control-h) rounded-(--control-radius) bg-(--field-bg) ps-3 pe-8 font-medium shadow-(--shadow-field) focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** On phones the filters fold away behind a button; from lg they are always shown. */
/** `badge`: how many filters are on, already formatted for the locale (or null). */
export function FilterPanel({ badge, children }: { badge: string | null; children: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className="grid content-start gap-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="shop-filter-panel"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-(--control-h) items-center justify-center gap-2 rounded-(--control-radius) bg-card px-4 text-sm font-semibold shadow-(--shadow-control) inset-ring inset-ring-foreground/18 lg:hidden"
      >
        {open ? (
          <X aria-hidden="true" className="size-4" />
        ) : (
          <SlidersHorizontal aria-hidden="true" className="size-4" />
        )}
        {open ? t("shop.f.hideFilters") : t("shop.f.showFilters")}
        {badge ? (
          <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
            {badge}
          </span>
        ) : null}
      </button>
      <div id="shop-filter-panel" className={cn("grid content-start gap-6", !open && "max-lg:hidden")}>
        {children}
      </div>
    </div>
  );
}
