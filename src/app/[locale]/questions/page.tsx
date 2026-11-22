import { MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Mishu } from "@/components/brand/mishu";
import { PageTransition } from "@/components/motion/page-transition";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { SPECIES } from "@/content/geo";
import { QuestionList } from "@/features/questions";
import { listQuestions, PAGE_SIZE } from "@/features/questions/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("qa.title"), t("qa.sub"), ROUTES.questions, await getLocale());
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

async function Results({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const speciesSlug = one(sp.species);
  const species = SPECIES.find((s) => s.slug === speciesSlug) ?? null;
  const filter = one(sp.show) === "answered" ? "answered" : one(sp.show) === "open" ? "open" : "all";
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const { items, total } = await listQuestions({
    speciesId: species?.id ?? null,
    q: one(sp.q),
    filter,
    page,
  });
  const base = localeHref(locale, ROUTES.questions);
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
    return (qs ? `${base}/?${qs}` : base) as never;
  };
  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full bg-card px-3 py-1 text-sm shadow-(--shadow-control) transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
    );

  return (
    <div className="grid gap-5">
      <nav aria-label={t("common.species")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Link href={hrefWith({ species: null })} className={chip(!species)}>
          {t("common.all")}
        </Link>
        {SPECIES.map((s) => (
          <Link key={s.id} href={hrefWith({ species: s.slug })} className={chip(species?.id === s.id)}>
            {locale === "bn" ? s.bn : s.en}
          </Link>
        ))}
      </nav>
      <nav aria-label={t("qa.show")} className="flex gap-2">
        {(["all", "answered", "open"] as const).map((f) => (
          <Link key={f} href={hrefWith({ show: f === "all" ? null : f })} className={chip(filter === f)}>
            {t(f === "all" ? "common.all" : f === "answered" ? "qa.answered" : "qa.unanswered")}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <div className="grid justify-items-center gap-4 rounded-(--radius-xl) border-(length:--border-w) border-dashed p-10 text-center">
          <Mishu mood="listening" className="size-24" />
          <p className="max-w-sm text-muted-foreground">{t("qa.empty")}</p>
        </div>
      ) : (
        <QuestionList items={items} locale={locale} t={t} fmt={fmt} />
      )}
      {items.length < total && page * PAGE_SIZE < total ? (
        <div className="flex justify-center">
          <ButtonLink href={hrefWith({ page: String(page + 1) })} variant="outline" scroll={false}>
            {t("common.loadMore")}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

export default async function QuestionsPage({ searchParams }: PageProps<"/[locale]/questions">) {
  const t = await getT();
  const locale = await getLocale();
  return (
    <PageTransition>
      <div className="container-page grid max-w-3xl gap-8 py-8 md:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              {t("qa.title")}
            </h1>
            <p className="text-pretty text-muted-foreground">{t("qa.sub")}</p>
          </div>
          <ButtonLink href={localeHref(locale, ROUTES.ask)} size="lg">
            <MessageCircleQuestion aria-hidden="true" />
            {t("qa.ask")}
          </ButtonLink>
        </header>
        <Suspense
          fallback={
            <div role="status" className="grid gap-3">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-28 rounded-(--radius-xl)" />
              ))}
            </div>
          }
        >
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
