import Link from "next/link";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { SHOP_CATEGORIES } from "@/content/shop";
import { CartLink, ProductTile } from "@/features/shop";
import { listProducts } from "@/features/shop/server";
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
  const products = await listProducts({ category, locale });
  const base = localeHref(locale, ROUTES.shop);
  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border-(length:--border-w) px-3 py-1 text-sm transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
    );
  return (
    <div className="grid gap-6">
      <nav aria-label={t("shop.category")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Link href={base} className={chip(!category)}>
          {t("common.all")}
        </Link>
        {SHOP_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`${base}/?category=${c.slug}` as never}
            className={chip(category === c.slug)}
          >
            {locale === "bn" ? c.bn : c.en}
          </Link>
        ))}
      </nav>
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
