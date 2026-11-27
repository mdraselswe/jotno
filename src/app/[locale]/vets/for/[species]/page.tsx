import { BadgeCheck, CircleCheck, MessageCircle, SlidersHorizontal, Stethoscope } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EmptyState } from "@/components/layout/app-ui";
import { FaqList } from "@/components/marketing/faq-list";
import { PageTransition } from "@/components/motion/page-transition";
import { ButtonLink } from "@/components/ui/button-link";
import { JsonLd } from "@/components/ui/json-ld";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES, speciesPath, vetPath } from "@/config/routes";
import { SPECIES_PAGE_SLUGS, speciesPages, type SpeciesSlug } from "@/content/species-pages";
import { VetCard, VetCardSkeleton } from "@/features/providers";
import { searchProviders, SpeciesLinks, vetCountsBySpecies } from "@/features/providers/server";
import { pickLocale, plural } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";
import { splitAccent, stripAccent } from "@/lib/rich-text";
import { absoluteUrl, breadcrumbLd, faqLd } from "@/lib/structured-data";

/**
 * Vets for one animal: a landing page for "বিড়ালের ডাক্তার" / "cattle vet"
 * searches, with its own text (src/content/species-pages.ts). Indexed (and in
 * the sitemap) only while a real verified vet treats that animal.
 */
const SHOWN = 24;
const isSpecies = (s: string): s is SpeciesSlug => (SPECIES_PAGE_SLUGS as readonly string[]).includes(s);

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/vets/for/[species]">): Promise<Metadata> {
  const { species, locale } = await params;
  if (!isSpecies(species)) return { robots: { index: false } };
  const page = pickLocale(speciesPages, locale)[species];
  const meta = pageMetadata(page.title, page.description, speciesPath(species), locale);
  const counts = await vetCountsBySpecies();
  const hasVets = counts.some((c) => c.slug === species && c.count > 0);
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

async function SpeciesVets({ species, name }: { species: SpeciesSlug; name: string }) {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { featured, results, total } = await searchProviders({ species, page: 1, pageSize: SHOWN });
  const vetsHref = localeHref(locale, ROUTES.vets);
  if (featured.length === 0 && results.length === 0) {
    return (
      <EmptyState
        icon={Stethoscope}
        title={t("pubui.vets.emptyTitle")}
        body={t("pubui.district.emptyBody")}
        action={
          <ButtonLink href={`${vetsHref}/?now=1` as Route} variant="brand">
            <MessageCircle aria-hidden="true" />
            {t("pubui.district.online")}
          </ButtonLink>
        }
      />
    );
  }
  const vets = [...featured, ...results];
  const n = total + featured.length;
  return (
    <div className="grid gap-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name,
          numberOfItems: n,
          itemListElement: vets.map((v, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: absoluteUrl(vetPath(v.slug), locale),
            name: v.displayName,
          })),
        }}
      />
      <p className="font-heading text-lg font-semibold">
        {t(plural(locale, n, "vets.resultsOne", "vets.results"), { n: fmt.number(n) })}
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
        <ButtonLink
          href={`${vetsHref}/?species=${species}` as Route}
          variant="outline"
          className="justify-self-start"
        >
          {t("common.seeAll")}
        </ButtonLink>
      ) : null}
    </div>
  );
}

async function SpeciesPage({ params }: { params: Promise<{ species: string }> }) {
  const { species } = await params;
  if (!isSpecies(species)) notFound();
  const locale = await getLocale();
  const t = await getT();
  const page = pickLocale(speciesPages, locale)[species];
  const name = stripAccent(page.h1);
  const heading = splitAccent(page.h1);

  return (
    <>
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: t("nav.home"), route: ROUTES.home },
          { name: t("nav.vets"), route: ROUTES.vets },
          { name, route: speciesPath(species) },
        ])}
      />
      <JsonLd data={faqLd(page.faq)} />
      <section data-no-reveal className="relative surface-soft dots">
        <div className="container-page grid max-w-4xl gap-5 py-10 md:py-16">
          <p className="inline-flex items-center gap-2 justify-self-start rounded-full bg-card px-3 py-1.5 text-sm font-semibold text-primary shadow-(--shadow-control)">
            <BadgeCheck aria-hidden="true" className="size-4" />
            {t("pubui.vets.eyebrow")}
          </p>
          <h1 className="font-heading text-[2.15rem] leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-6xl">
            {heading.map((part, i) =>
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
          <p className="max-w-2xl text-lg text-pretty text-muted-foreground">{page.intro}</p>
          <ButtonLink
            href={`${localeHref(locale, ROUTES.vets)}/?species=${species}` as Route}
            variant="outline"
            className="justify-self-start"
          >
            <SlidersHorizontal aria-hidden="true" />
            {t("pubui.district.filter")}
          </ButtonLink>
        </div>
      </section>

      <div className="container-page grid gap-14 py-8 md:py-12">
        <Suspense fallback={<ResultsSkeleton />}>
          <SpeciesVets species={species} name={name} />
        </Suspense>

        <section className="grid gap-4" aria-labelledby="species-issues">
          <h2 id="species-issues" className="font-heading text-2xl font-bold tracking-tight">
            {page.issuesTitle}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {page.issues.map((issue) => (
              <li key={issue} className="flex items-start gap-2 text-pretty">
                <CircleCheck aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-success" />
                {issue}
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-4" aria-labelledby="species-faq">
          <h2 id="species-faq" className="font-heading text-2xl font-bold tracking-tight">
            {t("pubui.species.faq")}
          </h2>
          <FaqList items={page.faq} />
        </section>

        <Suspense fallback={null}>
          <SpeciesLinks title={t("pubui.species.others")} exclude={species} />
        </Suspense>
      </div>
    </>
  );
}

function SpeciesSkeleton() {
  return (
    <div className="container-page grid gap-6 py-10 md:py-16">
      <Skeleton className="h-8 w-48 rounded-full" />
      <Skeleton className="h-14 max-w-xl" />
      <ResultsSkeleton />
    </div>
  );
}

export default function Page({ params }: PageProps<"/[locale]/vets/for/[species]">) {
  return (
    <PageTransition>
      <Suspense fallback={<SpeciesSkeleton />}>
        <SpeciesPage params={params} />
      </Suspense>
    </PageTransition>
  );
}
