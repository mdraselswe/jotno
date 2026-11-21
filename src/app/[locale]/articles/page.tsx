import Link from "next/link";
import { Suspense } from "react";
import { Mishu } from "@/components/brand/mishu";
import { PageTransition } from "@/components/motion/page-transition";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { articlePath, ROUTES } from "@/config/routes";
import { SPECIES } from "@/content/geo";
import { speciesName } from "@/content/places";
import { ARTICLES_PAGE, listArticles } from "@/features/articles/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("art.title"), t("art.sub"), ROUTES.articles, await getLocale());
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
  const base = localeHref(locale, ROUTES.articles);
  const href = (speciesSlug: string | null, p?: number) => {
    const qs = new URLSearchParams();
    if (speciesSlug) qs.set("species", speciesSlug);
    if (p && p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return (s ? `${base}/?${s}` : base) as never;
  };
  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border-(length:--border-w) px-3 py-1 text-sm transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
    );
  return (
    <div className="grid gap-6">
      <nav aria-label={t("common.species")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Link href={href(null)} className={chip(!species)}>
          {t("common.all")}
        </Link>
        {SPECIES.map((s) => (
          <Link key={s.id} href={href(s.slug)} className={chip(species?.id === s.id)}>
            {locale === "bn" ? s.bn : s.en}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <div className="grid justify-items-center gap-4 rounded-(--radius-xl) border-(length:--border-w) border-dashed p-10 text-center">
          <Mishu mood="sleeping" className="size-24" />
          <p className="text-muted-foreground">{t("art.empty")}</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((a) => (
            <li key={a.id}>
              <Link
                href={localeHref(locale, articlePath(a.slug))}
                className="grid h-full gap-2 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad) shadow-(--shadow-card) transition-colors hover:bg-muted/40"
              >
                {a.speciesId ? (
                  <span className="text-xs font-medium text-primary">{speciesName(a.speciesId, locale)}</span>
                ) : null}
                <span className="font-heading text-lg leading-snug font-semibold">{a.title}</span>
                {a.excerpt ? (
                  <span className="line-clamp-3 text-sm text-muted-foreground">{a.excerpt}</span>
                ) : null}
                <span className="mt-auto text-xs text-muted-foreground">
                  {a.vetName}
                  {a.publishedAt ? ` · ${fmt.date(a.publishedAt)}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {page * ARTICLES_PAGE < total ? (
        <div className="flex justify-center">
          <ButtonLink href={href(species?.slug ?? null, page + 1)} variant="outline" scroll={false}>
            {t("common.loadMore")}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

export default async function ArticlesPage({ searchParams }: PageProps<"/[locale]/articles">) {
  const t = await getT();
  return (
    <PageTransition>
      <div className="container-page grid gap-8 py-8 md:py-12">
        <header className="grid max-w-2xl gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">{t("art.title")}</h1>
          <p className="text-pretty text-muted-foreground">{t("art.sub")}</p>
        </header>
        <Suspense
          fallback={
            <div role="status" className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-40 rounded-(--radius-xl)" />
              ))}
            </div>
          }
        >
          <List searchParams={searchParams} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
