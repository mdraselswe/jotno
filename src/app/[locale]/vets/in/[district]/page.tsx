import { BadgeCheck, MapPin, MessageCircle, SlidersHorizontal } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EmptyState } from "@/components/layout/app-ui";
import { PageTransition } from "@/components/motion/page-transition";
import { ButtonLink } from "@/components/ui/button-link";
import { JsonLd } from "@/components/ui/json-ld";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { districtPath, ROUTES, vetPath } from "@/config/routes";
import { districtBySlug } from "@/content/places";
import { VetCard, VetCardSkeleton } from "@/features/providers";
import { DistrictLinks, searchProviders, vetCountsByDistrict } from "@/features/providers/server";
import { plural } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";
import { taka } from "@/lib/money";
import { splitAccent } from "@/lib/rich-text";
import { absoluteUrl, breadcrumbLd } from "@/lib/structured-data";

/**
 * Vets in one district: a landing page for "vet in Dhaka" / "ঢাকা পশু ডাক্তার"
 * searches. Indexed (and in the sitemap) only while the district has a real
 * verified vet, so empty districts never become thin pages.
 */
const SHOWN = 24;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/vets/in/[district]">): Promise<Metadata> {
  const { district: slug, locale } = await params;
  const district = districtBySlug(slug);
  if (!district) return { robots: { index: false } };
  const [t, fmt, counts] = await Promise.all([getT(), getFormatter(), vetCountsByDistrict()]);
  const name = locale === "bn" ? district.bn : district.en;
  const vars = { district: name, chat: taka(fmt, business.consult.minFee) };
  const meta = pageMetadata(
    t("pubui.district.metaTitle", vars),
    t("pubui.district.metaDescription", vars),
    districtPath(slug),
    locale,
  );
  const hasVets = counts.some((c) => c.districtId === district.id && c.count > 0);
  return hasVets ? meta : { ...meta, robots: { index: false, follow: true } };
}

function ResultsSkeleton() {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i}>
          <VetCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

async function DistrictVets({ districtId, name }: { districtId: number; name: string }) {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { featured, results, total } = await searchProviders({ districtId, page: 1, pageSize: SHOWN });
  const all = `${localeHref(locale, ROUTES.vets)}/?district=${districtId}` as Route;

  if (featured.length === 0 && results.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title={t("pubui.district.emptyTitle", { district: name })}
        body={t("pubui.district.emptyBody")}
        action={
          <ButtonLink href={`${localeHref(locale, ROUTES.vets)}/?now=1` as Route} variant="brand">
            <MessageCircle aria-hidden="true" />
            {t("pubui.district.online")}
          </ButtonLink>
        }
      />
    );
  }

  const vets = [...featured, ...results];
  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("pubui.district.metaTitle", { district: name }),
    numberOfItems: total + featured.length,
    itemListElement: vets.map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(vetPath(v.slug), locale),
      name: v.displayName,
    })),
  };

  return (
    <div className="grid gap-6">
      <JsonLd data={list} />
      <p className="font-heading text-lg font-semibold">
        {t(plural(locale, total + featured.length, "vets.resultsOne", "vets.results"), {
          n: fmt.number(total + featured.length),
        })}
      </p>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vets.map((v) => (
          <li key={v.id}>
            <VetCard vet={v} locale={locale} t={t} fmt={fmt} />
          </li>
        ))}
      </ul>
      {featured.length > 0 ? (
        <p className="text-xs text-muted-foreground">{t("vets.sponsoredNote")}</p>
      ) : null}
      {total > results.length ? (
        <ButtonLink href={all} variant="outline" className="justify-self-start">
          {t("pubui.district.seeAll", { district: name })}
        </ButtonLink>
      ) : null}
    </div>
  );
}

async function DistrictPage({ params }: { params: Promise<{ district: string }> }) {
  const { district: slug } = await params;
  const district = districtBySlug(slug);
  if (!district) notFound();
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const name = locale === "bn" ? district.bn : district.en;
  const title = splitAccent(t("pubui.district.title", { district: name }));
  const filters = `${localeHref(locale, ROUTES.vets)}/?district=${district.id}` as Route;

  return (
    <>
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: t("nav.home"), route: ROUTES.home },
          { name: t("nav.vets"), route: ROUTES.vets },
          { name, route: districtPath(slug) },
        ])}
      />
      <section data-no-reveal className="relative surface-soft dots">
        <div className="container-page grid max-w-4xl gap-5 py-10 md:py-16">
          <p className="inline-flex items-center gap-2 justify-self-start rounded-full bg-card px-3 py-1.5 text-sm font-semibold text-primary shadow-(--shadow-control)">
            <BadgeCheck aria-hidden="true" className="size-4" />
            {t("pubui.vets.eyebrow")}
          </p>
          <h1 className="font-heading text-[2.15rem] leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-6xl">
            {title.map((part, i) =>
              part.accent ? (
                <span key={i} className="font-extrabold text-primary">
                  {part.text}
                </span>
              ) : (
                <span key={i} className="font-light">
                  {part.text}
                </span>
              ),
            )}
          </h1>
          <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
            {t("pubui.district.sub", { district: name, chat: taka(fmt, business.consult.minFee) })}
          </p>
          <ButtonLink href={filters} variant="outline" className="justify-self-start">
            <SlidersHorizontal aria-hidden="true" />
            {t("pubui.district.filter")}
          </ButtonLink>
        </div>
      </section>

      <div className="container-page grid gap-12 py-8 md:py-12">
        <Suspense fallback={<ResultsSkeleton />}>
          <DistrictVets districtId={district.id} name={name} />
        </Suspense>
        <Suspense fallback={null}>
          <DistrictLinks title={t("pubui.district.others")} exclude={district.id} />
        </Suspense>
      </div>
    </>
  );
}

function DistrictSkeleton() {
  return (
    <div className="container-page grid gap-6 py-10 md:py-16">
      <Skeleton className="h-8 w-48 rounded-full" />
      <Skeleton className="h-14 max-w-xl" />
      <ResultsSkeleton />
    </div>
  );
}

export default function Page({ params }: PageProps<"/[locale]/vets/in/[district]">) {
  return (
    <PageTransition>
      <Suspense fallback={<DistrictSkeleton />}>
        <DistrictPage params={params} />
      </Suspense>
    </PageTransition>
  );
}
