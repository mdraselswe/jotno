import { MessageCircleQuestion, MessagesSquare, Search, SearchX, Siren, X } from "lucide-react";
import type { Route } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, FilterPills } from "@/components/layout/app-ui";
import { PageTransition } from "@/components/motion/page-transition";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { SPECIES } from "@/content/geo";
import { QuestionList, QuestionListSkeleton } from "@/features/questions";
import { listQuestions, PAGE_SIZE } from "@/features/questions/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("qa.title"), t("qa.sub"), ROUTES.questions, await getLocale());
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
type Show = "all" | "answered" | "open";
const showOf = (v: string | null): Show => (v === "answered" || v === "open" ? v : "all");

/** The question search in the header. A plain GET form: it keeps the animal and answered filters. */
async function QuestionSearch({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getT();
  const q = one(sp.q) ?? "";
  const species = one(sp.species);
  const show = one(sp.show);
  return (
    <Form
      action={`${localeHref(locale, ROUTES.questions)}/` as Route}
      scroll={false}
      role="search"
      className="relative flex items-center"
    >
      <label htmlFor="qa-q" className="sr-only">
        {t("common.search")}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        key={q}
        id="qa-q"
        name="q"
        type="search"
        enterKeyHint="search"
        defaultValue={q}
        maxLength={80}
        placeholder={t("pubui.qa.searchPlaceholder")}
        className="h-(--control-h-lg) bg-card ps-11 pe-24 text-base"
      />
      {species ? <input type="hidden" name="species" value={species} /> : null}
      {show ? <input type="hidden" name="show" value={show} /> : null}
      <Button type="submit" variant="brand" className="absolute end-1.5 top-1/2 -translate-y-1/2">
        {t("common.search")}
      </Button>
    </Form>
  );
}

async function Results({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const speciesSlug = one(sp.species);
  const species = SPECIES.find((s) => s.slug === speciesSlug) ?? null;
  const filter = showOf(one(sp.show));
  const q = one(sp.q)?.trim() || null;
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const { items, total } = await listQuestions({ speciesId: species?.id ?? null, q, filter, page });
  const base = `${localeHref(locale, ROUTES.questions)}/`;
  const hrefWith = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const value = one(v);
      if (value && k !== "page") next.set(k, value);
    }
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    return (qs ? `${base}?${qs}` : base) as Route;
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <div className="grid min-w-0 grid-cols-1 gap-3">
        <FilterPills
          label={t("common.species")}
          items={[
            { href: hrefWith({ species: null }), label: t("common.all"), active: !species },
            ...SPECIES.map((s) => ({
              href: hrefWith({ species: s.slug }),
              label: locale === "bn" ? s.bn : s.en,
              active: species?.id === s.id,
            })),
          ]}
        />
        <FilterPills
          label={t("qa.show")}
          items={(["all", "answered", "open"] as const).map((f) => ({
            href: hrefWith({ show: f === "all" ? null : f }),
            label: t(f === "all" ? "common.all" : f === "answered" ? "qa.answered" : "qa.unanswered"),
            active: filter === f,
          }))}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-heading text-lg font-semibold" aria-live="polite">
          {q
            ? t("pubui.qa.resultsFor", { n: fmt.number(total), q })
            : t("pubui.qa.results", { n: fmt.number(total) })}
        </p>
        {q ? (
          <Link
            href={hrefWith({ q: null })}
            scroll={false}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <X aria-hidden="true" className="size-4" />
            {t("pubui.qa.clearSearch")}
          </Link>
        ) : null}
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={q ? SearchX : MessagesSquare}
          title={q ? t("pubui.qa.noMatch") : t("qa.empty")}
          action={
            <ButtonLink href={localeHref(locale, ROUTES.ask)} variant="brand">
              <MessageCircleQuestion aria-hidden="true" />
              {t("qa.ask")}
            </ButtonLink>
          }
        />
      ) : (
        <QuestionList items={items} locale={locale} t={t} fmt={fmt} />
      )}
      {items.length < total && page * PAGE_SIZE < total ? (
        <div className="flex justify-center pt-2">
          <ButtonLink href={hrefWith({ page: String(page + 1) })} variant="outline" size="lg" scroll={false}>
            {t("common.loadMore")}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div role="status" className="grid gap-5">
      <div className="grid gap-3">
        {[9, 4].map((n, row) => (
          <div key={row} className="flex gap-1.5 overflow-hidden">
            {Array.from({ length: n }, (_, i) => (
              <Skeleton key={i} className="h-9 w-16 shrink-0 rounded-full" />
            ))}
          </div>
        ))}
      </div>
      <Skeleton className="h-[1lh] w-32 font-heading text-lg" />
      <QuestionListSkeleton />
    </div>
  );
}

export default async function QuestionsPage({ searchParams }: PageProps<"/[locale]/questions">) {
  const t = await getT();
  const locale = await getLocale();
  const fmt = await getFormatter();
  const ask = localeHref(locale, ROUTES.ask);
  return (
    <PageTransition>
      <section data-no-reveal className="relative surface-soft dots">
        <div className="container-page grid gap-5 py-10 md:py-16">
          <p className="inline-flex items-center gap-2 justify-self-start rounded-full bg-card px-3 py-1.5 text-sm font-semibold text-primary shadow-(--shadow-control)">
            <MessagesSquare aria-hidden="true" className="size-4" />
            {t("pubui.qa.eyebrow")}
          </p>
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div className="grid max-w-2xl gap-3">
              <h1 className="font-heading text-[2.15rem] leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl md:text-6xl">
                {t("qa.title")}
              </h1>
              <p className="text-lg text-pretty text-muted-foreground">{t("qa.sub")}</p>
            </div>
            <ButtonLink href={ask} variant="brand" size="lg" className="max-sm:w-full">
              <MessageCircleQuestion aria-hidden="true" />
              {t("qa.ask")}
            </ButtonLink>
          </div>
          <div className="max-w-2xl">
            <Suspense fallback={<Skeleton className="h-(--control-h-lg) rounded-(--control-radius)" />}>
              <QuestionSearch searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </section>

      <div className="container-page grid grid-cols-1 gap-8 py-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
        <aside className="grid gap-4 lg:sticky lg:top-24">
          <section className="grid gap-4 rounded-(--radius-2xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6">
            <h2 className="font-heading text-base font-semibold">{t("pubui.qa.howTitle")}</h2>
            <ol className="grid gap-3">
              {(["pubui.qa.how1", "pubui.qa.how2", "pubui.qa.how3"] as const).map((key, i) => (
                <li key={key} className="flex gap-3 text-sm text-pretty">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 font-heading text-sm font-bold text-primary tabular-nums">
                    {fmt.number(i + 1)}
                  </span>
                  <span className="pt-0.5">{t(key)}</span>
                </li>
              ))}
            </ol>
            <ButtonLink href={ask} variant="outline" className="w-full">
              {t("qa.ask")}
            </ButtonLink>
          </section>
          <section className="grid gap-2 rounded-(--radius-2xl) bg-destructive/8 p-5 ring-1 ring-destructive/20">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
              <Siren aria-hidden="true" className="size-4.5 text-destructive" />
              {t("pubui.qa.urgentTitle")}
            </h2>
            <p className="text-sm text-pretty text-muted-foreground">{t("pubui.qa.urgentBody")}</p>
            <ButtonLink
              href={localeHref(locale, ROUTES.emergency)}
              variant="destructive"
              className="mt-1 justify-self-start"
            >
              {t("pubui.qa.urgentCta")}
            </ButtonLink>
          </section>
        </aside>
      </div>
    </PageTransition>
  );
}
