import { BadgeCheck, CalendarDays, MessageCircle, SearchX, SlidersHorizontal, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/layout/app-ui";
import { PageTransition } from "@/components/motion/page-transition";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { DISTRICTS, SPECIES } from "@/content/geo";
import { AREAS } from "@/content/geo-areas";
import { VetCard, VetCardSkeleton, VetFilterPanel, VetFilterSheet, VetSearchBar } from "@/features/providers";
import { searchProviders } from "@/features/providers/server";
import type { Translate } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { parseNear, parseRadius, widerRadius } from "@/lib/geo";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";
import { taka } from "@/lib/money";
import { splitAccent } from "@/lib/rich-text";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("vets.title"), t("vets.sub"), ROUTES.vets, await getLocale());
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
const int = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null);

/** The search params as one flat map (first value of each), without empty ones. */
function flat(sp: Search): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const value = one(v);
    if (value) out[k] = value;
  }
  return out;
}

interface Chip {
  key: string;
  label: string;
  href: Route;
}

/** One removable chip per active filter (each link drops that filter and the page). */
function activeChips(
  params: Record<string, string>,
  base: string,
  locale: string,
  t: Translate,
  km: (n: number) => string,
): Chip[] {
  const without = (...keys: string[]) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (k !== "page" && !keys.includes(k)) next.set(k, v);
    const qs = next.toString();
    return (qs ? `${base}?${qs}` : base) as Route;
  };
  const name = (x: { en: string; bn: string }) => (locale === "bn" ? x.bn : x.en);
  const chips: Chip[] = [];
  if (params.q)
    chips.push({ key: "q", label: t("pubui.vets.searchChip", { q: params.q }), href: without("q") });
  if (params.now === "1") chips.push({ key: "now", label: t("vets.onlyOnline"), href: without("now") });
  const sp = SPECIES.find((s) => s.slug === params.species);
  if (sp) chips.push({ key: "species", label: name(sp), href: without("species") });
  if (parseNear(params.near)) {
    chips.push({
      key: "near",
      label: t("pubui.vets.nearChip", { km: km(parseRadius(params.r)) }),
      href: without("near", "r"),
    });
  } else {
    const district = DISTRICTS.find((d) => d.id === int(params.district ?? null));
    const area = district
      ? AREAS.find((a) => a.id === int(params.area ?? null) && a.d === district.id)
      : null;
    if (district) chips.push({ key: "district", label: name(district), href: without("district", "area") });
    if (area) chips.push({ key: "area", label: name(area), href: without("area") });
  }
  return chips;
}

async function Results({ searchParams }: { searchParams: Promise<Search> }) {
  const params = flat(await searchParams);
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const base = `${localeHref(locale, ROUTES.vets)}/`;
  const near = parseNear(params.near);
  const radiusKm = parseRadius(params.r);
  const page = Math.max(1, int(params.page ?? null) ?? 1);
  const { featured, results, total } = await searchProviders({
    districtId: near ? null : int(params.district ?? null),
    areaId: near ? null : int(params.area ?? null),
    species: params.species ?? null,
    q: params.q ?? null,
    onlyAvailable: params.now === "1",
    near,
    radiusKm,
    page,
  });
  const km = (n: number) => t("vets.km", { n: fmt.number(n) });
  const chips = activeChips(params, base, locale, t, km);

  const toolbar = (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-heading text-lg font-semibold" aria-live="polite">
          {t("vets.results", { n: fmt.number(total) })}
        </p>
        <div className="lg:hidden">
          <VetFilterSheet />
        </div>
      </div>
      {chips.length > 0 ? (
        <ul className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <li key={c.key}>
              <Link
                href={c.href}
                scroll={false}
                aria-label={t("pubui.vets.removeFilter", { name: c.label })}
                className="inline-flex h-8 max-w-[16rem] items-center gap-1.5 rounded-full bg-primary/10 ps-3 pe-2 text-sm font-medium text-primary ring-1 ring-primary/20 transition-colors duration-(--motion-fast) hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="truncate">{c.label}</span>
                <X aria-hidden="true" className="size-3.5 shrink-0" />
              </Link>
            </li>
          ))}
          {chips.length > 1 ? (
            <li>
              <Link
                href={base as Route}
                scroll={false}
                className="inline-flex h-8 items-center px-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("pubui.vets.clearAll")}
              </Link>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );

  if (featured.length === 0 && results.length === 0) {
    const wider = near ? widerRadius(radiusKm) : null;
    const widen = new URLSearchParams(params);
    widen.delete("page");
    if (wider) widen.set("r", String(wider));
    return (
      <div className="grid min-w-0 grid-cols-1 gap-5">
        {toolbar}
        <EmptyState
          icon={SearchX}
          title={t("pubui.vets.emptyTitle")}
          body={near ? t("vets.noneNear", { km: fmt.number(radiusKm) }) : t("vets.noResults")}
          action={
            <>
              {wider ? (
                <ButtonLink href={`${base}?${widen.toString()}` as Route} scroll={false} variant="brand">
                  {t("vets.widen", { km: fmt.number(wider) })}
                </ButtonLink>
              ) : chips.length > 0 ? (
                <ButtonLink href={base as Route} scroll={false} variant="brand">
                  {t("pubui.vets.clearAll")}
                </ButtonLink>
              ) : null}
              <ButtonLink href={localeHref(locale, ROUTES.ask)} variant="outline">
                {t("account.quickAsk")}
              </ButtonLink>
            </>
          }
        />
      </div>
    );
  }

  const next = new URLSearchParams(params);
  next.set("page", String(page + 1));

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      {toolbar}
      {featured.length > 0 ? (
        <section className="grid gap-3" aria-labelledby="vets-featured">
          <h2 id="vets-featured" className="sr-only">
            {t("pubui.vets.featuredTitle")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {featured.map((v) => (
              <li key={v.id}>
                <VetCard vet={v} locale={locale} t={t} fmt={fmt} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("vets.sponsoredNote")}</p>
        </section>
      ) : null}
      {results.length > 0 ? (
        <section className="grid gap-4" aria-labelledby="vets-all">
          <h2 id="vets-all" className="sr-only">
            {t("pubui.vets.allTitle")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {results.map((v) => (
              <li key={v.id}>
                <VetCard vet={v} locale={locale} t={t} fmt={fmt} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="grid justify-items-center gap-3 pt-2">
        <p className="text-sm text-muted-foreground">
          {t("pubui.vets.showing", { shown: fmt.number(results.length), total: fmt.number(total) })}
        </p>
        {results.length < total ? (
          <ButtonLink href={`${base}?${next.toString()}` as Route} variant="outline" size="lg" scroll={false}>
            {t("common.loadMore")}
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-[1lh] w-28 font-heading text-lg" />
        <Skeleton className="h-(--control-h) w-28 rounded-(--control-radius) lg:hidden" />
      </div>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <VetCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilterPanelSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-12 rounded-(--radius-lg)" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-16 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-(--control-h) w-32 rounded-(--control-radius)" />
      <Skeleton className="h-(--control-h) rounded-(--control-radius)" />
    </div>
  );
}

export default async function VetsPage({ searchParams }: PageProps<"/[locale]/vets">) {
  const t = await getT();
  const fmt = await getFormatter();
  const title = splitAccent(t("pubui.vets.heroTitle"));
  const trust = [
    { icon: BadgeCheck, text: t("pubui.vets.trustChecked") },
    { icon: MessageCircle, text: t("pubui.vets.trustChat", { fee: taka(fmt, business.consult.minFee) }) },
    { icon: CalendarDays, text: t("pubui.vets.trustBook") },
  ];
  return (
    <PageTransition>
      <section data-no-reveal className="relative surface-soft dots">
        <div className="container-page grid max-w-4xl gap-5 py-10 md:py-16">
          <p className="inline-flex items-center gap-2 justify-self-start rounded-full bg-card px-3 py-1.5 text-sm font-semibold text-primary shadow-(--shadow-control)">
            <BadgeCheck aria-hidden="true" className="size-4" />
            {t("pubui.vets.eyebrow")}
          </p>
          <h1 className="font-heading text-[2.15rem] leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-6xl">
            {title.map((part, i) =>
              part.accent ? (
                <span key={i} className="font-extrabold text-primary sm:scribble sm:text-foreground">
                  {part.text}
                </span>
              ) : (
                <span key={i} className="font-light">
                  {part.text}
                </span>
              ),
            )}
          </h1>
          <p className="max-w-2xl text-lg text-pretty text-muted-foreground">{t("vets.sub")}</p>
          <Suspense
            fallback={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Skeleton className="h-(--control-h-lg) flex-1 rounded-(--control-radius)" />
                <Skeleton className="h-(--control-h-lg) rounded-(--control-radius) sm:w-36" />
              </div>
            }
          >
            <VetSearchBar />
          </Suspense>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
            {trust.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-1.5">
                <Icon aria-hidden="true" className="size-4 text-primary" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="container-page grid grid-cols-1 gap-8 py-8 md:py-10 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
        <aside className="max-lg:hidden lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
          <div className="rounded-(--radius-2xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6">
            <p className="mb-5 flex items-center gap-2 font-heading text-base font-semibold">
              <SlidersHorizontal aria-hidden="true" className="size-4.5 text-primary" />
              {t("vets.filters")}
            </p>
            <Suspense fallback={<FilterPanelSkeleton />}>
              <VetFilterPanel />
            </Suspense>
          </div>
        </aside>
        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
