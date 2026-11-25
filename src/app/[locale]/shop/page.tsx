import { BadgeCheck, Banknote, ChevronLeft, ChevronRight, Search, Smartphone, Truck, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { EmptyState } from "@/components/layout/app-ui";
import { ShopScene } from "@/components/illustrations/shop-scene";
import { PageTransition } from "@/components/motion/page-transition";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { SPECIES } from "@/content/geo";
import {
  CartLink,
  categoryLabel,
  defaultSort,
  FilterButton,
  FilterDrawer,
  FilterPanel,
  hasFilters,
  parseShopFilters,
  productArt,
  ProductTile,
  ProductTileSkeleton,
  SHOP_FORM_ID,
  SHOP_PAGE_SIZE,
  SHOP_SORTS,
  ShopFilterForm,
  shopQuery,
  SortSelect,
  toggle,
  type ShopFilters,
} from "@/features/shop";
import { shopCatalog, shopCategories } from "@/features/shop/server";
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
  const [sp, locale, categories] = await Promise.all([searchParams, getLocale(), shopCategories()]);
  const f = parseShopFilters(sp, categories);
  const base = localeHref(locale, ROUTES.shop);
  const href = (next: ShopFilters) => {
    const q = shopQuery(next);
    return (q ? `${base}/?${q}` : base) as Route;
  };
  return { f, locale, base, href, categories };
}

/** The search box: part of the filter form (form attribute), so the filters stay on. */
function SearchBox({ t, q }: { t: Translate; q: string }) {
  return (
    <div role="search" className="relative flex w-full max-w-xl gap-2">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground"
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
        className="h-12 min-w-0 flex-1 rounded-full bg-card ps-11 text-base shadow-(--shadow-card)"
      />
      <Button type="submit" form={SHOP_FORM_ID} variant="brand" size="lg" className="h-12 rounded-full px-5">
        <span className="max-[380px]:sr-only">{t("shop.f.go")}</span>
        <Search aria-hidden="true" className="min-[381px]:hidden" />
      </Button>
    </div>
  );
}

async function HeaderSearch({ searchParams }: { searchParams: Promise<SP> }) {
  const [{ f }, t] = await Promise.all([context(searchParams), getT()]);
  return <SearchBox t={t} q={f.q} />;
}

/** Why buy here: delivery, cash on delivery, wallets, checked products. */
function TrustStrip({ t }: { t: Translate }) {
  const items = [
    { icon: Truck, title: t("shopui.trust.delivery"), sub: t("shopui.trust.deliverySub") },
    { icon: Banknote, title: t("shopui.trust.cod"), sub: t("shopui.trust.codSub") },
    { icon: Smartphone, title: t("shopui.trust.wallets"), sub: t("shopui.trust.walletsSub") },
    { icon: BadgeCheck, title: t("shopui.trust.checked"), sub: t("shopui.trust.checkedSub") },
  ];
  return (
    <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      {items.map(({ icon: Icon, title, sub }) => (
        <li
          key={title}
          className="flex items-start gap-3 rounded-(--radius-xl) bg-card p-3 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-4"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-(--radius-lg) bg-primary/10 text-primary sm:size-10">
            <Icon aria-hidden="true" className="size-4.5" />
          </span>
          <span className="grid min-w-0 gap-0.5">
            <span className="text-sm leading-tight font-semibold">{title}</span>
            <span className="text-xs text-pretty text-muted-foreground max-sm:hidden">{sub}</span>
          </span>
        </li>
      ))}
    </ul>
  );
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
  icon?: ReactNode;
}) {
  const none = count === 0 && !checked;
  return (
    <label
      className={cn(
        "flex min-h-10 cursor-pointer items-center gap-3 rounded-(--control-radius) px-2.5 text-sm transition-colors duration-(--motion-fast) hover:bg-foreground/5 has-checked:bg-primary/8 has-checked:font-medium has-focus-visible:ring-2 has-focus-visible:ring-ring",
        none && "opacity-45",
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="size-4.5 shrink-0 accent-primary"
      />
      {icon}
      <span className="min-w-0 flex-1">{label}</span>
      <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">
        {fmt.number(count)}
      </span>
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-0.5 lg:rounded-(--radius-2xl) lg:bg-card lg:p-3 lg:shadow-(--shadow-card) lg:ring-1 lg:ring-foreground/6">
      <legend className="float-left mb-1.5 w-full px-2.5 font-heading text-sm font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

async function Catalog({ searchParams }: { searchParams: Promise<SP> }) {
  const [{ f, locale, base, href, categories }, t, fmt] = await Promise.all([
    context(searchParams),
    getT(),
    getFormatter(),
  ]);
  const { items, total, pages, page, facets } = await shopCatalog(f, locale, categories);
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
      label: categoryLabel(categories, c, locale),
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
  const from = (page - 1) * SHOP_PAGE_SIZE + 1;

  return (
    <FilterDrawer>
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
        <aside aria-label={t("shop.f.filters")} className="lg:sticky lg:top-24 lg:self-start">
          <ShopFilterForm action={base as Route}>
            <FilterPanel
              showLabel={t("shopui.showResults", { n: fmt.number(total) })}
              clearHref={hasFilters(f) ? (base as Route) : null}
            >
              <Group title={t("shop.category")}>
                {categories.map((c) => {
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
                      icon={<Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />}
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
                <div className="flex flex-wrap gap-1.5 px-2 pb-3">
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
                          "inline-flex h-8 items-center rounded-full px-3 text-xs font-medium ring-1 transition-colors duration-(--motion-fast)",
                          on
                            ? "bg-foreground text-background ring-foreground"
                            : "bg-card ring-foreground/15 hover:bg-foreground/5",
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
                      className="h-10 bg-card text-sm"
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
                      className="h-10 bg-card text-sm"
                    />
                  </label>
                </div>
              </Group>
              <Group title={t("shopui.availability")}>
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
              {/* Desktop (and no-JS): apply the typed price, clear everything. */}
              <div className="flex flex-wrap gap-2 px-2 max-lg:hidden">
                <Button type="submit" size="sm" variant="outline">
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

        <div className="grid min-w-0 content-start gap-4">
          {/* Quick category row: one tap, one category. */}
          <nav
            aria-label={t("shop.category")}
            className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 md:-mx-1 md:px-1"
          >
            {[
              { slug: null, label: t("common.all") },
              ...categories.map((c) => ({ slug: c.slug, label: locale === "bn" ? c.bn : c.en })),
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
                    "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium ring-1 transition-colors duration-(--motion-fast)",
                    on
                      ? "bg-foreground text-background ring-foreground"
                      : "bg-card ring-foreground/10 hover:bg-muted",
                  )}
                >
                  {Icon ? <Icon aria-hidden="true" className={cn("size-4", !on && "text-primary")} /> : null}
                  {c.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <p aria-live="polite" className="min-w-0 font-heading text-base font-bold sm:text-lg">
              {f.q
                ? t("shop.f.resultsFor", { n: fmt.number(total), q: f.q })
                : t("shop.f.results", { n: fmt.number(total) })}
              {pages > 1 ? (
                <span className="ms-2 text-sm font-normal text-muted-foreground">
                  {t("shopui.showing", {
                    from: fmt.number(from),
                    to: fmt.number(Math.min(total, from + items.length - 1)),
                  })}
                </span>
              ) : null}
            </p>
            <div className="flex min-w-0 items-center gap-2 max-sm:w-full">
              <FilterButton badge={active > 0 ? fmt.number(active) : null} />
              <div className="min-w-0 max-sm:ms-auto">
                <SortSelect
                  value={f.sort === fallback ? "" : f.sort}
                  options={sorts}
                  label={t("shop.sort")}
                />
              </div>
            </div>
          </div>

          {chips.length > 0 ? (
            <ul className="flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <li key={c.key}>
                  <Link
                    href={c.href}
                    scroll={false}
                    aria-label={t("shop.f.remove", { name: c.label })}
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-primary/12 ps-3 pe-2 text-xs font-semibold text-primary transition-colors duration-(--motion-fast) hover:bg-primary/20"
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
                  className="inline-flex h-8 items-center px-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
                >
                  {t("shop.f.clear")}
                </Link>
              </li>
            </ul>
          ) : null}

          {items.length === 0 ? (
            <EmptyState
              icon={Search}
              title={t("shop.f.noMatch")}
              body={t("shop.f.noMatchHint")}
              action={
                hasFilters(f) ? (
                  <ButtonLink href={base as Route} variant="outline">
                    {t("shop.f.clear")}
                  </ButtonLink>
                ) : null
              }
            />
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
    </FilterDrawer>
  );
}

function CatalogSkeleton() {
  return (
    <div role="status" className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
      <div className="grid content-start gap-4 max-lg:hidden">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-44 rounded-(--radius-2xl)" />
        ))}
      </div>
      <div className="grid min-w-0 content-start gap-4">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-(--control-h) w-36 rounded-(--control-radius)" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <ProductTileSkeleton key={i} />
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
      <div className="container-page grid gap-6 py-6 md:gap-8 md:py-10">
        <section
          data-no-reveal
          className="relative grid items-center gap-5 overflow-hidden rounded-(--radius-3xl) surface-warm dots p-5 sm:p-8 md:grid-cols-[1.4fr_1fr] md:p-10"
        >
          <div className="absolute top-3 right-3 z-10 sm:top-5 sm:right-5">
            <CartLink className="bg-card shadow-(--shadow-control)" />
          </div>
          <div className="grid gap-5">
            <div className="grid max-w-xl gap-2.5 pe-12 md:pe-0">
              <h1 className="font-heading text-4xl leading-[0.95] font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                {t("shop.title")}
              </h1>
              <p className="text-base text-pretty text-foreground/75 sm:text-lg">{t("shop.sub")}</p>
            </div>
            <Suspense fallback={<SearchBox t={t} q="" />}>
              <HeaderSearch searchParams={searchParams} />
            </Suspense>
          </div>
          <ShopScene className="mx-auto max-w-[20rem] max-md:hidden" />
        </section>
        <TrustStrip t={t} />
        <Suspense fallback={<CatalogSkeleton />}>
          <Catalog searchParams={searchParams} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
