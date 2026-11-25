"use client";

import { SlidersHorizontal, X } from "lucide-react";
import type { Route } from "next";
import Form from "next/form";
import Link from "next/link";
import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Button } from "@/components/ui/button";
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
    <label className="flex min-w-0 items-center gap-2 text-sm">
      <span className="shrink-0 text-muted-foreground max-sm:sr-only">{label}</span>
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
        className="h-(--control-h) max-w-[11rem] min-w-0 truncate rounded-(--control-radius) border-(length:--border-w) border-(--field-line) bg-(--field-bg) ps-3 pe-8 font-medium shadow-(--shadow-field) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:max-w-none"
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

const Drawer = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  trigger: RefObject<HTMLButtonElement | null>;
  panelId: string;
} | null>(null);

function useDrawer() {
  const ctx = use(Drawer);
  if (!ctx) throw new Error("Use inside <FilterDrawer>");
  return ctx;
}

/** Shares the phone filter sheet's open state between its button (in the toolbar) and the panel. */
export function FilterDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  return <Drawer value={{ open, setOpen, trigger, panelId }}>{children}</Drawer>;
}

/** Phones and tablets: opens the filter sheet. `badge`: how many filters are on (formatted), or null. */
export function FilterButton({ badge }: { badge: string | null }) {
  const t = useT();
  const { open, setOpen, trigger, panelId } = useDrawer();
  return (
    <Button
      ref={trigger}
      type="button"
      variant="outline"
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={t("shop.f.showFilters")}
      onClick={() => setOpen(true)}
      className="lg:hidden"
    >
      <SlidersHorizontal aria-hidden="true" />
      {t("shop.f.filters")}
      {badge ? (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
          {badge}
        </span>
      ) : null}
    </Button>
  );
}

/**
 * The filters: a sidebar from lg, a bottom sheet on phones. One set of fields
 * either way (always in the form, so the search box and sort keep them).
 */
export function FilterPanel({
  showLabel,
  clearHref,
  children,
}: {
  /** "Show 24 products", already formatted. */
  showLabel: string;
  /** Link that removes every filter, or null when none is on. */
  clearHref: Route | null;
  children: ReactNode;
}) {
  const t = useT();
  const { open, setOpen, trigger, panelId } = useDrawer();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = `${panelId}-title`;

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const onClose = useEffectEvent(close);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const wide = window.matchMedia("(min-width: 64rem)");
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onWide = () => {
      if (wide.matches) onClose();
    };
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={() => close()}
        className={cn(
          "fixed inset-0 z-50 bg-black/30 transition-opacity duration-(--motion-base) supports-backdrop-filter:backdrop-blur-xs lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        ref={panel}
        id={panelId}
        tabIndex={-1}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-labelledby={open ? titleId : undefined}
        className={cn(
          "outline-none",
          // Phones: a sheet from the bottom.
          "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 max-lg:flex max-lg:max-h-[88svh] max-lg:flex-col max-lg:rounded-t-(--radius-3xl) max-lg:bg-popover max-lg:text-popover-foreground max-lg:shadow-(--shadow-overlay) max-lg:transition-[translate,visibility] max-lg:duration-(--motion-slow) max-lg:ease-(--ease-ui)",
          !open && "max-lg:invisible max-lg:translate-y-full",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b px-5 pt-3 pb-3 lg:hidden">
          <span
            aria-hidden="true"
            className="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-foreground/15"
          />
          <h2 id={titleId} className="font-heading text-lg font-bold">
            {t("shop.f.filters")}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("common.close")}
            onClick={() => close()}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="grid content-start gap-6 max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:px-3 max-lg:py-4">
          {children}
        </div>
        <div className="flex items-center gap-2 border-t px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
          {clearHref ? (
            <Link
              href={clearHref}
              scroll={false}
              className="inline-flex h-(--control-h) items-center px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              {t("shop.f.clear")}
            </Link>
          ) : null}
          <Button type="submit" variant="brand" size="lg" className="flex-1" onClick={() => setOpen(false)}>
            {showLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
