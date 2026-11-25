import { Banknote, ChevronRight, Phone, RotateCcw, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { StatusBadge } from "@/components/layout/app-ui";
import { JsonLd } from "@/components/ui/json-ld";
import { Skeleton } from "@/components/ui/skeleton";
import { localePath } from "@/config/locale";
import { pageUrl, productPath, ROUTES } from "@/config/routes";
import { SPECIES } from "@/content/geo";
import { getSettings } from "@/features/settings/server";
import {
  categoryLabel,
  percentOff,
  productArt,
  ProductArt,
  ProductBuyBox,
  ProductGallery,
  ProductTile,
  ProductTileSkeleton,
} from "@/features/shop";
import { getProduct, shopCategories } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop/[slug]">): Promise<Metadata> {
  const { slug, locale } = await params;
  const p = await getProduct(slug, locale);
  if (!p) return { robots: { index: false } };
  const url = pageUrl(localePath(locale, productPath(slug)));
  return {
    title: p.name,
    description: p.description ?? p.name,
    alternates: { canonical: url },
    openGraph: { title: p.name, url, images: p.imageUrl ? [p.imageUrl] : undefined },
  };
}

function InfoRow({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-4.5" />
      </span>
      <div className="grid min-w-0 gap-0.5 text-sm">
        <p className="font-semibold">{title}</p>
        <div className="text-pretty text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

async function Product({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const [p, settings, categories] = await Promise.all([
    getProduct(slug, locale),
    getSettings(),
    shopCategories(true),
  ]);
  if (!p) notFound();
  const off = percentOff(p.price, p.compareAt);
  const shop = localeHref(locale, ROUTES.shop);
  const catName = categoryLabel(categories, p.category, locale);
  const inCategory = `${shop}/?category=${p.category}` as Route;
  const pet = SPECIES.find((s) => s.id === p.speciesId);
  const { delivery } = settings;
  const badge =
    off > 0 ? (
      <span className="rounded-full bg-highlight px-2.5 py-1 text-sm font-bold text-highlight-foreground tabular-nums shadow-(--shadow-control)">
        {t("shopui.off", { n: fmt.number(off) })}
      </span>
    ) : null;

  return (
    <div className="grid gap-10 md:gap-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          description: p.description ?? undefined,
          image: p.imageUrl ?? undefined,
          sku: p.sku ?? undefined,
          offers: {
            "@type": "Offer",
            priceCurrency: "BDT",
            price: (p.price / 100).toFixed(2),
            availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        }}
      />
      <nav aria-label={t("shopui.breadcrumb")} className="-mb-4 text-sm md:-mb-8">
        <ol className="flex min-w-0 flex-wrap items-center gap-1 text-muted-foreground">
          <li>
            <Link href={shop} className="hover:text-foreground hover:underline">
              {t("shop.title")}
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
            <Link href={inCategory} className="hover:text-foreground hover:underline">
              {catName}
            </Link>
          </li>
          <li aria-current="page" className="flex min-w-0 items-center gap-1 text-foreground max-sm:hidden">
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{p.name}</span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10 lg:gap-14">
        <div className="md:sticky md:top-24 md:self-start">
          {p.gallery.length > 0 ? (
            <ProductGallery urls={p.gallery} alt={p.name} badge={badge} />
          ) : (
            <div
              className={cn(
                "relative grid aspect-square place-items-center overflow-hidden rounded-(--radius-2xl) shadow-(--shadow-card) ring-1 ring-foreground/6",
                productArt(p.category).tone,
              )}
            >
              <ProductArt category={p.category} className="size-1/3 text-primary/60" />
              {badge ? <div className="absolute top-3 left-3">{badge}</div> : null}
            </div>
          )}
        </div>

        <div className="grid content-start gap-5">
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {catName}
              </span>
              {pet ? (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                  {t("shopui.forPet", { pet: locale === "bn" ? pet.bn : pet.en })}
                </span>
              ) : null}
            </div>
            <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl lg:text-4xl">
              {p.name}
            </h1>
            {p.unit ? <p className="text-sm text-muted-foreground">{p.unit}</p> : null}
          </div>

          {/* Price block */}
          <div className="grid gap-2 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-heading text-3xl font-bold tabular-nums sm:text-4xl">
                {taka(fmt, p.price)}
              </span>
              {off > 0 && p.compareAt ? (
                <>
                  <span className="text-base text-muted-foreground tabular-nums line-through">
                    <span className="sr-only">{t("shopui.wasPrice")} </span>
                    {taka(fmt, p.compareAt)}
                  </span>
                  <span className="text-sm font-semibold text-success">
                    {t("shopui.youSave", { amount: taka(fmt, p.compareAt - p.price) })}
                  </span>
                </>
              ) : null}
            </div>
            <div>
              {p.stock <= 0 ? (
                <StatusBadge tone="danger">{t("shop.outOfStock")}</StatusBadge>
              ) : p.stock <= 5 ? (
                <StatusBadge tone="warning">{t("shop.onlyLeft", { n: fmt.number(p.stock) })}</StatusBadge>
              ) : (
                <StatusBadge tone="success">{t("shopui.inStock")}</StatusBadge>
              )}
            </div>
            <div className="mt-2 border-t pt-4">
              <ProductBuyBox productId={p.id} name={p.name} stock={p.stock} price={taka(fmt, p.price)} />
            </div>
          </div>

          {/* Delivery, payment and returns */}
          <ul className="divide-y overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6">
            <InfoRow icon={Truck} title={t("shopui.info.delivery")}>
              {t("shopui.info.deliveryBody", {
                inside: taka(fmt, delivery.inside),
                outside: taka(fmt, delivery.outside),
              })}
              {delivery.freeFrom > 0 ? (
                <span className="block font-medium text-success">
                  {t("shopui.info.freeFrom", { amount: taka(fmt, delivery.freeFrom) })}
                </span>
              ) : null}
            </InfoRow>
            <InfoRow
              icon={settings.cod.enabled ? Banknote : ShieldCheck}
              title={settings.cod.enabled ? t("shopui.info.cod") : t("shopui.info.pay")}
            >
              {settings.cod.enabled ? t("shopui.info.codBody") : t("shopui.info.payBody")}
            </InfoRow>
            <InfoRow icon={RotateCcw} title={t("shopui.info.returns")}>
              {t("shopui.info.returnsBody")}
              {settings.supportPhone ? (
                <a
                  href={`tel:${settings.supportPhone}`}
                  className="mt-1 flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
                >
                  <Phone aria-hidden="true" className="size-3.5" />
                  {settings.supportPhone}
                </a>
              ) : null}
            </InfoRow>
          </ul>

          {p.description ? (
            <section className="grid gap-2">
              <h2 className="font-heading text-lg font-bold">{t("shopui.about")}</h2>
              <p className="text-pretty whitespace-pre-wrap text-foreground/80">{p.description}</p>
            </section>
          ) : null}
          {p.sku ? (
            <p className="text-xs text-muted-foreground">
              {t("shopui.sku")}: <span className="font-mono">{p.sku}</span>
            </p>
          ) : null}
        </div>
      </div>

      {p.related.length > 0 ? (
        <section className="grid gap-4" aria-labelledby="related-title">
          <div className="flex items-end justify-between gap-3">
            <h2 id="related-title" className="font-heading text-xl font-bold sm:text-2xl">
              {t("shop.related")}
            </h2>
            <Link
              href={inCategory}
              className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              {t("shopui.seeAll")}
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {p.related.map((r) => (
              <li key={r.id}>
                <ProductTile p={r} locale={locale} t={t} fmt={fmt} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div role="status" className="grid gap-10">
      <Skeleton className="h-4 w-48" />
      <div className="grid gap-6 md:grid-cols-2 md:gap-10 lg:gap-14">
        <Skeleton className="aspect-square rounded-(--radius-2xl)" />
        <div className="grid content-start gap-4">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-9 w-4/5" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-52 rounded-(--radius-2xl)" />
          <Skeleton className="h-56 rounded-(--radius-2xl)" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <ProductTileSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function ProductPage({ params }: PageProps<"/[locale]/shop/[slug]">) {
  return (
    <div className="container-page py-6 md:py-10">
      <Suspense fallback={<ProductSkeleton />}>
        <Product params={params} />
      </Suspense>
    </div>
  );
}
