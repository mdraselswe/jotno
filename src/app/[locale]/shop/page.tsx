import { ChevronLeft, ChevronRight, Search, Truck, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ShopScene } from "@/components/illustrations/shop-scene";
import { Spot } from "@/components/illustrations/spots";
import { PageTransition } from "@/components/motion/page-transition";
import { ButtonLink } from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { SPECIES } from "@/content/geo";
import { SHOP_CATEGORIES, categoryName } from "@/content/shop";
import {
  CartLink,
  defaultSort,
  FilterPanel,
  hasFilters,
  parseShopFilters,
  productArt,
  ProductTile,
  SHOP_FORM_ID,
  SHOP_SORTS,
  ShopFilterForm,
  shopQuery,
  SortSelect,
  toggle,
  type ShopFilters,
} from "@/features/shop";
import { shopCatalog } from "@/features/shop/server";
import type { Formatter, Translate } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("shop.title"), t("shop.sub"), ROUTES.shop, await getLocale());
}

type SP = Record<string, string | string[] | undefined>;

/** Quick price ranges, in taka. */
const PRICE_BANDS: [number | null, number | null][] = [
  [null, 300],
  [300, 700],
  [700, 1500],
  [1500, null],
];

async function context(searchParams: Promise<SP>) {
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
  const f = parseShopFilters(sp);
  const base = localeHref(locale, ROUTES.shop);
  const href = (next: ShopFilters) => {
    const q = shopQuery(next);
    return (q ? `${base}/?${q}` : base) as Route;
  };
  return { f, locale, base, href };
}

function Intro({ t }: { t: Translate }) {
  return (
    <div className="grid max-w-xl gap-3">
      <h1 className="font-heading text-5xl leading-[0.92] font-extrabold tracking-tight md:text-7xl">
        {t("shop.title")}
      </h1>
      <p className="text-lg text-pretty text-foreground/75">{t("shop.sub")}</p>
      <p className="flex items-center gap-2 text-sm font-medium">
        <Truck aria-hidden="true" className="size-4 text-primary" />
        {t("shop.secure")}
      </p>
    </div>
  );
}

/** The search box: part of the filter form (form attribute), so the filters stay on. */
function SearchBox({ t, q }: { t: Translate; q: string }) {
  return (
    <div role="search" className="relative flex max-w-xl gap-2">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        name="q"
        type="search"
        form={SHOP_FORM_ID}
        defaultValue={q}
        key={q}
        maxLength={60}
        enterKeyHint="search"
        placeholder={t("shop.search")}
        aria-label={t("shop.search")}
        className="h-12 bg-card ps-10 text-base"
      />
      <Button type="submit" form={SHOP_FORM_ID} size="lg" className="h-12">
        {t("shop.f.go")}
      </Button>
    </div>
  );
}

async function HeaderSearch({ searchParams }: { searchParams: Promise<SP> }) {
  const [{ f }, t] = await Promise.all([context(searchParams), getT()]);
  return <SearchBox t={t} q={f.q} />;
}

function Check({
  name,
  value,
  checked,
  label,
  count,
  fmt,
  icon,
}: {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  count: number;
  fmt: Formatter;
  icon?: React.ReactNode;
}) {
  const none = count === 0 && !checked;
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-(--control-radius) px-2 py-1.5 text-sm transition-colors hover:bg-foreground/5",
        none && "opacity-45",
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="size-4 shrink-0 accent-primary"
      />
      {icon}
      <span className="flex-1">{label}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{fmt.number(count)}</span>
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-1">
      <legend className="mb-1.5 px-2 font-heading text-sm font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

async function Catalog({ searchParams }: { searchParams: Promise<SP> }) {
  const [{ f, locale, base, href }, t, fmt] = await Promise.all([
    context(searchParams),
    getT(),
    getFormatter(),
  ]);
  const { items, total, pages, page, facets } = await shopCatalog(f, locale);
  const tk = (n: number) => fmt.money(n, { maximumFractionDigits: 0 });
  const fresh = { ...f, page: 1 };
  const active =
    f.categories.length +
    f.pets.length +
    (f.min !== null || f.max !== null ? 1 : 0) +
    Number(f.inStock) +
    Number(f.onSale);

  // Removable chips for every filter that is on.
  const chips: { key: string; label: string; href: Route }[] = [
    ...(f.q
      ? [
          {
            key: "q",
            label: `“${f.q}”`,
            href: href({ ...fresh, q: "", sort: f.sort === "relevance" ? "popular" : f.sort }),
          },
        ]
      : []),
    ...f.categories.map((c) => ({
      key: `c-${c}`,
      label: categoryName(c, locale),
      href: href(toggle(f, "categories", c)),
    })),
    ...f.pets.map((p) => {
      const s = SPECIES.find((x) => x.slug === p);
      return {
        key: `p-${p}`,
        label: s ? (locale === "bn" ? s.bn : s.en) : p,
        href: href(toggle(f, "pets", p)),
      };
    }),
    ...(f.min !== null || f.max !== null
      ? [
          {
            key: "price",
            label:
              f.min !== null && f.max !== null
                ? t("shop.f.between", { from: tk(f.min), to: tk(f.max) })
                : f.max !== null
                  ? t("shop.f.under", { amount: tk(f.max) })
                  : t("shop.f.over", { amount: tk(f.min ?? 0) }),
            href: href({ ...fresh, min: null, max: null }),
          },
        ]
      : []),
    ...(f.inStock
      ? [{ key: "stock", label: t("shop.f.inStock"), href: href({ ...fresh, inStock: false }) }]
      : []),
    ...(f.onSale
      ? [{ key: "sale", label: t("shop.f.onSale"), href: href({ ...fresh, onSale: false }) }]
      : []),
  ];

  const pets = SPECIES.filter((s) => (facets.pets[s.slug] ?? 0) > 0 || f.pets.includes(s.slug));
  // The default sort is the empty option, so it stays out of the address and a new search falls back to "best match".
  const fallback = defaultSort(f.q);
  const sorts = [
    { value: "", label: t(`shop.sort.${fallback}`) },
    ...SHOP_SORTS.filter((s) => s !== "relevance" && s !== fallback).map((s) => ({
      value: s,
      label: t(`shop.sort.${s}`),
    })),
  ];
  const priceHint = facets.price
    ? { min: String(Math.floor(facets.price.min / 100)), max: String(Math.ceil(facets.price.max / 100)) }
    : { min: "0", max: "" };

  return (
    <div className="grid gap-8 lg:grid-cols-[15.5rem_1fr]">
      <aside aria-label={t("shop.f.filters")} className="lg:sticky lg:top-24 lg:self-start">
        <ShopFilterForm action={base as Route}>
          <FilterPanel badge={active > 0 ? fmt.number(active) : null}>
            <Group title={t("shop.category")}>
              {SHOP_CATEGORIES.map((c) => {
                const Icon = productArt(c.slug).icon;
                return (
                  <Check
                    key={c.slug}
                    name="category"
                    value={c.slug}
                    checked={f.categories.includes(c.slug)}
                    label={locale === "bn" ? c.bn : c.en}
                    count={facets.categories[c.slug] ?? 0}
                    fmt={fmt}
                    icon={<Icon aria-hidden="true" className="size-4 text-primary" />}
                  />
                );
              })}
            </Group>
            {pets.length > 0 ? (
              <Group title={t("shop.f.pet")}>
                {pets.map((s) => (
                  <Check
                    key={s.slug}
                    name="pet"
                    value={s.slug}
                    checked={f.pets.includes(s.slug)}
                    label={locale === "bn" ? s.bn : s.en}
                    count={facets.pets[s.slug] ?? 0}
                    fmt={fmt}
                  />
                ))}
              </Group>
            ) : null}
            <Group title={t("shop.f.price")}>
              <div className="flex flex-wrap gap-1.5 px-2 pb-2">
                {PRICE_BANDS.map(([min, max]) => {
                  const on = f.min === min && f.max === max;
                  const label =
                    min === null
                      ? t("shop.f.under", { amount: tk(max ?? 0) })
                      : max === null
                        ? t("shop.f.over", { amount: tk(min) })
                        : t("shop.f.between", { from: tk(min), to: tk(max) });
                  return (
                    <Link
                      key={`${min}-${max}`}
                      href={href(on ? { ...fresh, min: null, max: null } : { ...fresh, min, max })}
                      scroll={false}
                      aria-current={on ? "true" : undefined}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors",
                        on
                          ? "bg-foreground text-background ring-foreground"
                          : "ring-foreground/15 hover:bg-foreground/5",
                      )}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2 px-2">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  {t("shop.f.min")}
                  <Input
                    name="min"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    defaultValue={f.min ?? ""}
                    key={`min-${f.min}`}
                    placeholder={priceHint.min}
                    className="h-9 bg-card text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  {t("shop.f.max")}
                  <Input
                    name="max"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    defaultValue={f.max ?? ""}
                    key={`max-${f.max}`}
                    placeholder={priceHint.max}
                    className="h-9 bg-card text-sm"
                  />
                </label>
              </div>
            </Group>
            <Group title={t("shop.f.filters")}>
              <Check
                name="stock"
                value="1"
                checked={f.inStock}
                label={t("shop.f.inStock")}
                count={facets.inStock}
                fmt={fmt}
              />
              <Check
                name="sale"
                value="1"
                checked={f.onSale}
                label={t("shop.f.onSale")}
                count={facets.onSale}
                fmt={fmt}
              />
            </Group>
            <div className="flex flex-wrap gap-2 px-2">
              <Button type="submit" size="sm">
                {t("shop.f.apply")}
              </Button>
              {hasFilters(f) ? (
                <ButtonLink href={base as Route} variant="ghost" size="sm">
                  {t("shop.f.clear")}
                </ButtonLink>
              ) : null}
            </div>
          </FilterPanel>
        </ShopFilterForm>
      </aside>

      <div className="grid content-start gap-5">
        {/* Quick category row: one tap, one category. */}
        <nav aria-label={t("shop.category")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {[
            { slug: null, label: t("common.all") },
            ...SHOP_CATEGORIES.map((c) => ({ slug: c.slug, label: locale === "bn" ? c.bn : c.en })),
          ].map((c) => {
            const on =
              c.slug === null
                ? f.categories.length === 0
                : f.categories.length === 1 && f.categories[0] === c.slug;
            const Icon = c.slug ? productArt(c.slug).icon : null;
            return (
              <Link
                key={c.slug ?? "all"}
                href={href({ ...fresh, categories: c.slug ? [c.slug] : [] })}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium shadow-(--shadow-control) transition-colors",
                  on ? "bg-foreground text-background" : "bg-card hover:bg-muted",
                )}
              >
                {Icon ? <Icon aria-hidden="true" className={cn("size-4", !on && "text-primary")} /> : null}
                {c.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="font-heading text-lg font-bold">
            {f.q
              ? t("shop.f.resultsFor", { n: fmt.number(total), q: f.q })
              : t("shop.f.results", { n: fmt.number(total) })}
          </p>
          <SortSelect value={f.sort === fallback ? "" : f.sort} options={sorts} label={t("shop.sort")} />
        </div>

        {chips.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <li key={c.key}>
                <Link
                  href={c.href}
                  scroll={false}
                  aria-label={t("shop.f.remove", { name: c.label })}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/12 py-1 ps-3 pe-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  {c.label}
                  <X aria-hidden="true" className="size-3.5" />
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={base as Route}
                scroll={false}
                className="inline-flex py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
              >
                {t("shop.f.clear")}
              </Link>
            </li>
          </ul>
        ) : null}

        {items.length === 0 ? (
          <div className="grid justify-items-center gap-3 rounded-(--radius-2xl) bg-card p-10 text-center shadow-(--shadow-card)">
            <Spot name="empty" className="w-40" />
            <p className="font-heading text-xl font-bold">{t("shop.f.noMatch")}</p>
            <p className="text-muted-foreground">{t("shop.f.noMatchHint")}</p>
            {hasFilters(f) ? (
              <ButtonLink href={base as Route} variant="outline">
                {t("shop.f.clear")}
              </ButtonLink>
            ) : null}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <li key={p.id}>
                <ProductTile p={p} locale={locale} t={t} fmt={fmt} />
              </li>
            ))}
          </ul>
        )}

        {pages > 1 ? (
          <nav aria-label={t("shop.f.pages")} className="flex items-center justify-center gap-2 pt-4">
            {page > 1 ? (
              <ButtonLink
                href={href({ ...f, page: page - 1 })}
                variant="outline"
                size="icon"
                aria-label={t("shop.f.prev")}
              >
                <ChevronLeft aria-hidden="true" />
              </ButtonLink>
            ) : null}
            <span className="px-3 text-sm text-muted-foreground tabular-nums">
              {t("shop.f.page", { n: fmt.number(page), total: fmt.number(pages) })}
            </span>
            {page < pages ? (
              <ButtonLink
                href={href({ ...f, page: page + 1 })}
                variant="outline"
                size="icon"
                aria-label={t("shop.f.next")}
              >
                <ChevronRight aria-hidden="true" />
              </ButtonLink>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div role="status" className="grid gap-8 lg:grid-cols-[15.5rem_1fr]">
      <div className="grid content-start gap-3 max-lg:hidden">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-8 rounded-(--control-radius)" />
        ))}
      </div>
      <div className="grid content-start gap-5">
        <Skeleton className="h-10 w-full max-w-xl rounded-full" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-(--radius-2xl)" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function ShopPage({ searchParams }: PageProps<"/[locale]/shop">) {
  const t = await getT();
  return (
    <PageTransition>
      <div className="container-page grid gap-8 py-8 md:py-12">
        <section
          data-no-reveal
          className="relative grid items-center gap-6 overflow-hidden rounded-(--radius-3xl) surface-warm dots p-6 sm:p-10 md:grid-cols-[1.25fr_1fr]"
        >
          <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
            <CartLink />
          </div>
          <div className="grid gap-6">
            <Intro t={t} />
            <Suspense fallback={<SearchBox t={t} q="" />}>
              <HeaderSearch searchParams={searchParams} />
            </Suspense>
          </div>
          <ShopScene className="mx-auto max-w-[22rem] max-md:-mb-4 max-md:max-w-[16rem]" />
        </section>
        <Suspense fallback={<CatalogSkeleton />}>
          <Catalog searchParams={searchParams} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
