import { Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { SHOP_CATEGORIES } from "@/content/shop";
import { CartLink, ProductTile } from "@/features/shop";
import { listProducts, PRODUCT_SORTS, type ProductSort } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("shop.title"), t("shop.sub"), ROUTES.shop, await getLocale());
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

async function Products({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const category = SHOP_CATEGORIES.find((c) => c.slug === one(sp.category))?.slug ?? null;
  const q = one(sp.q)?.slice(0, 60) ?? "";
  const rawSort = one(sp.sort);
  const sort: ProductSort = (PRODUCT_SORTS as readonly string[]).includes(rawSort ?? "")
    ? (rawSort as ProductSort)
    : "popular";
  const products = await listProducts({ category, q, sort, locale });
  const base = localeHref(locale, ROUTES.shop);
  const href = (patch: { category?: string | null; sort?: ProductSort }) => {
    const p = new URLSearchParams();
    const next = { category, sort, q, ...patch };
    if (next.category) p.set("category", next.category);
    if (next.q) p.set("q", next.q);
    if (next.sort !== "popular") p.set("sort", next.sort);
    const str = p.toString();
    return (str ? `${base}/?${str}` : base) as Route;
  };
  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border-(length:--border-w) px-3 py-1 text-sm transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
    );
  return (
    <div className="grid gap-6">
      <nav aria-label={t("shop.category")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Link href={href({ category: null })} className={chip(!category)}>
          {t("common.all")}
        </Link>
        {SHOP_CATEGORIES.map((c) => (
          <Link key={c.slug} href={href({ category: c.slug })} className={chip(category === c.slug)}>
            {locale === "bn" ? c.bn : c.en}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <form action={base} role="search" className="relative min-w-0 flex-1 basis-64">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {sort !== "popular" ? <input type="hidden" name="sort" value={sort} /> : null}
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t("shop.search")}
            aria-label={t("shop.search")}
            className="pl-9"
          />
        </form>
        <nav aria-label={t("shop.sort")} className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {PRODUCT_SORTS.map((s) => (
            <Link
              key={s}
              href={href({ sort: s })}
              aria-current={sort === s ? "true" : undefined}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs transition-colors",
                sort === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`shop.sort.${s}`)}
            </Link>
          ))}
        </nav>
      </div>
      {products.length === 0 ? (
        <p className="text-muted-foreground">{t("shop.empty")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <li key={p.id}>
              <ProductTile p={p} locale={locale} t={t} fmt={fmt} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function ShopPage({ searchParams }: PageProps<"/[locale]/shop">) {
  const t = await getT();
  return (
    <PageTransition>
      <div className="container-page grid gap-8 py-8 md:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid max-w-2xl gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              {t("shop.title")}
            </h1>
            <p className="text-pretty text-muted-foreground">{t("shop.sub")}</p>
          </div>
          <CartLink />
        </header>
        <Suspense
          fallback={
            <div role="status" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-(--radius-xl)" />
              ))}
            </div>
          }
        >
          <Products searchParams={searchParams} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
