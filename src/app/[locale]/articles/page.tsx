import { BookOpen, PenLine } from "lucide-react";
import type { Route } from "next";
import { Suspense } from "react";
import { EmptyState, FilterPills } from "@/components/layout/app-ui";
import { PageTransition } from "@/components/motion/page-transition";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { SPECIES } from "@/content/geo";
import { ArticleCard, ArticleCardSkeleton, ArticleFeature } from "@/features/articles";
import { ARTICLES_PAGE, listArticles } from "@/features/articles/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("pubui.seo.artTitle"), t("pubui.seo.artDesc"), ROUTES.articles, await getLocale());
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

async function List({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const species = SPECIES.find((s) => s.slug === one(sp.species)) ?? null;
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const { items, total } = await listArticles({ speciesId: species?.id ?? null, page });
  const base = `${localeHref(locale, ROUTES.articles)}/`;
  const href = (speciesSlug: string | null, p?: number) => {
    const qs = new URLSearchParams();
    if (speciesSlug) qs.set("species", speciesSlug);
    if (p && p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return (s ? `${base}?${s}` : base) as Route;
  };
  // The newest guide leads, but only on the unfiltered first view (a filter is a search, not a front page).
  const [first, ...rest] = items;
  const lead = !species && first ? first : null;
  const grid = lead ? rest : items;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <FilterPills
          label={t("common.species")}
          items={[
            { href: href(null), label: t("common.all"), active: !species },
            ...SPECIES.map((s) => ({
              href: href(s.slug),
              label: locale === "bn" ? s.bn : s.en,
              active: species?.id === s.id,
            })),
          ]}
        />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t("pubui.art.count", { n: fmt.number(total) })}
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("art.empty")}
          action={
            species ? (
              <ButtonLink href={href(null)} variant="brand">
                {t("common.seeAll")}
              </ButtonLink>
            ) : (
              <ButtonLink href={localeHref(locale, ROUTES.ask)} variant="outline">
                {t("account.quickAsk")}
              </ButtonLink>
            )
          }
        />
      ) : (
        <>
          {lead ? <ArticleFeature a={lead} t={t} fmt={fmt} locale={locale} /> : null}
          {grid.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {grid.map((a) => (
                <li key={a.id}>
                  <ArticleCard a={a} t={t} fmt={fmt} locale={locale} />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
      {page * ARTICLES_PAGE < total ? (
        <div className="flex justify-center pt-2">
          <ButtonLink href={href(species?.slug ?? null, page + 1)} variant="outline" size="lg" scroll={false}>
            {t("common.loadMore")}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <div className="flex gap-1.5 overflow-hidden">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-16 shrink-0 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-(--radius-2xl) md:h-80" />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i}>
            <ArticleCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ArticlesPage({ searchParams }: PageProps<"/[locale]/articles">) {
  const t = await getT();
  return (
    <PageTransition>
      <section data-no-reveal className="relative surface-warm dots">
        <div className="container-page grid gap-4 py-10 md:py-16">
          <p className="inline-flex items-center gap-2 justify-self-start rounded-full bg-card px-3 py-1.5 text-sm font-semibold text-primary shadow-(--shadow-control)">
            <PenLine aria-hidden="true" className="size-4" />
            {t("pubui.art.eyebrow")}
          </p>
          <h1 className="max-w-3xl font-heading text-[2.15rem] leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl md:text-6xl">
            {t("art.title")}
          </h1>
          <p className="max-w-2xl text-lg text-pretty text-foreground/75">{t("art.sub")}</p>
        </div>
      </section>
      <div className="container-page py-8 md:py-12">
        <Suspense fallback={<ListSkeleton />}>
          <List searchParams={searchParams} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
