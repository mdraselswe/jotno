import { Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JsonLd } from "@/components/ui/json-ld";
import { Skeleton } from "@/components/ui/skeleton";
import { localePath } from "@/config/locale";
import { pageUrl, productPath, ROUTES } from "@/config/routes";
import { categoryName } from "@/content/shop";
import { getSettings } from "@/features/settings/server";
import { AddToCartButton, CartLink, productArt, ProductArt, ProductTile } from "@/features/shop";
import { getProduct } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

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

async function Product({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const [p, settings] = await Promise.all([getProduct(slug, locale), getSettings()]);
  if (!p) notFound();
  return (
    <div className="grid gap-12">
      <div className="grid gap-8 md:grid-cols-2">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description: p.description ?? undefined,
            image: p.imageUrl ?? undefined,
            offers: {
              "@type": "Offer",
              priceCurrency: "BDT",
              price: (p.price / 100).toFixed(2),
              availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
          }}
        />
        <div
          className={`glow-border relative aspect-square overflow-hidden rounded-(--radius-2xl) shadow-(--shadow-card) ${productArt(p.category).tone}`}
        >
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- storage URL
            <img src={p.imageUrl} alt={p.name} className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center">
              <ProductArt category={p.category} className="size-1/3 text-primary/60" />
            </span>
          )}
        </div>
        <div className="grid content-start gap-4">
          <nav className="text-sm">
            <Link
              href={localeHref(locale, ROUTES.shop)}
              className="text-muted-foreground hover:text-foreground"
            >
              ← {categoryName(p.category, locale)}
            </Link>
          </nav>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{p.name}</h1>
          {p.unit ? <p className="text-sm text-muted-foreground">{p.unit}</p> : null}
          <p className="flex items-baseline gap-3">
            <span className="font-heading text-3xl font-semibold tabular-nums">{taka(fmt, p.price)}</span>
            {p.compareAt && p.compareAt > p.price ? (
              <span className="text-muted-foreground tabular-nums line-through">
                {taka(fmt, p.compareAt)}
              </span>
            ) : null}
          </p>
          {p.description ? (
            <p className="text-pretty whitespace-pre-wrap text-muted-foreground">{p.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <AddToCartButton productId={p.id} inStock={p.stock > 0} size="lg" />
            <CartLink />
          </div>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Truck aria-hidden="true" className="size-4 shrink-0 translate-y-0.5" />
            {t("shop.deliveryNote", {
              inside: taka(fmt, settings.delivery.inside),
              outside: taka(fmt, settings.delivery.outside),
              free: taka(fmt, settings.delivery.freeFrom),
            })}
          </p>
          <p className="text-sm text-muted-foreground">{t("shop.secure")}</p>
        </div>
      </div>
      {p.related.length > 0 ? (
        <section className="grid gap-4">
          <h2 className="font-heading text-2xl font-semibold">{t("shop.related")}</h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
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

export default function ProductPage({ params }: PageProps<"/[locale]/shop/[slug]">) {
  return (
    <div className="container-page py-8 md:py-12">
      <Suspense
        fallback={
          <div role="status" className="grid gap-8 md:grid-cols-2">
            <Skeleton className="aspect-square rounded-(--radius-xl)" />
            <Skeleton className="h-64" />
          </div>
        }
      >
        <Product params={params} />
      </Suspense>
    </div>
  );
}
