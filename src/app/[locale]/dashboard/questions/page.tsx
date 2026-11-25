import { Lock, MessageCircleQuestion, MessageSquareText, PawPrint, PenLine } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { EmptyState, FilterPills, PageHeader, StatusBadge } from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { questionPath, ROUTES } from "@/config/routes";
import { SPECIES } from "@/content/geo";
import { speciesName } from "@/content/places";
import { requireVet } from "@/features/providers/server";
import { listQuestions, questionsForVet } from "@/features/questions/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";

export const metadata = { title: "Questions", robots: { index: false } };

type SP = Record<string, string | string[] | undefined>;

async function Questions({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, locale, t, fmt] = await Promise.all([searchParams, getLocale(), getT(), getFormatter()]);
  const { provider } = await requireVet(locale, localeHref(locale, ROUTES.vetQuestions));
  const raw = Array.isArray(sp.species) ? sp.species[0] : sp.species;
  const species = SPECIES.find((s) => String(s.id) === raw) ?? null;
  const items = species
    ? (await listQuestions({ speciesId: species.id, filter: "open" })).items
    : await questionsForVet(provider.speciesIds, 30);
  const verified = provider.status === "verified";
  const base = localeHref(locale, ROUTES.vetQuestions);
  // The vet's own animals first in the filter row.
  const ordered = [...SPECIES].sort(
    (a, b) => Number(provider.speciesIds.includes(b.id)) - Number(provider.speciesIds.includes(a.id)),
  );

  return (
    <div className="grid gap-6">
      <PageHeader icon={MessageCircleQuestion} title={t("vet.openQuestions")} sub={t("qa.vetSub")} />

      {!verified ? (
        <p className="flex items-center gap-2.5 rounded-(--radius-xl) bg-warning/15 px-3 py-2.5 text-sm ring-1 ring-warning/40 sm:px-4">
          <Lock aria-hidden="true" className="size-4 shrink-0" />
          {t("qa.verifiedOnly")}
        </p>
      ) : null}
      {provider.speciesIds.length === 0 ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-(--radius-xl) bg-info/10 px-3 py-2.5 text-sm ring-1 ring-info/25 sm:px-4">
          <PawPrint aria-hidden="true" className="size-4 shrink-0 text-info" />
          <span className="min-w-0 flex-1 basis-48 text-pretty">{t("vetui.qa.addSpecies")}</span>
          <ButtonLink
            href={localeHref(locale, `${ROUTES.vetProfile}/#vp-services`)}
            variant="outline"
            size="sm"
          >
            {t("vetui.quick.profile")}
          </ButtonLink>
        </p>
      ) : null}

      <FilterPills
        label={t("vetui.qa.filter")}
        items={[
          { href: base, label: t("vetui.qa.forYou"), active: species === null },
          ...ordered.map((s) => ({
            href: `${base}/?species=${s.id}` as Route,
            label: locale === "bn" ? s.bn : s.en,
            active: species?.id === s.id,
          })),
        ]}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title={
            species
              ? t("vetui.qa.emptySpecies", { species: locale === "bn" ? species.bn : species.en })
              : t("qa.allAnswered")
          }
          body={t("vetui.qa.emptyBody")}
          action={
            species ? (
              <ButtonLink href={base} variant="outline" size="sm">
                {t("vetui.qa.seeAll")}
              </ButtonLink>
            ) : (
              <ButtonLink href={localeHref(locale, ROUTES.vetNewArticle)} variant="outline" size="sm">
                <PenLine aria-hidden="true" />
                {t("vetui.quick.article")}
              </ButtonLink>
            )
          }
        />
      ) : (
        <ul className="grid gap-3">
          {items.map((q) => {
            const mine = q.speciesId != null && provider.speciesIds.includes(q.speciesId);
            const href = localeHref(locale, questionPath(q.id));
            return (
              <li
                key={q.id}
                className="relative grid gap-3 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 transition-shadow duration-(--motion-base) ease-(--ease-ui) hover:shadow-(--shadow-card-hover) sm:flex sm:items-start sm:gap-4 sm:p-5"
              >
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-primary/10 text-primary max-sm:hidden"
                >
                  <MessageCircleQuestion className="size-5" />
                </span>
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <h2 className="font-heading text-base leading-snug font-semibold text-balance sm:text-lg">
                    <Link
                      href={href}
                      className="after:absolute after:inset-0 after:rounded-(--radius-2xl) hover:underline focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                    >
                      {q.title}
                    </Link>
                  </h2>
                  <p className="line-clamp-2 text-sm text-pretty text-muted-foreground">{q.excerpt}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                    {q.speciesId ? (
                      <StatusBadge tone={mine ? "primary" : "neutral"}>
                        {speciesName(q.speciesId, locale)}
                      </StatusBadge>
                    ) : null}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        q.answerCount > 0 && "font-medium text-success",
                      )}
                    >
                      <MessageSquareText aria-hidden="true" className="size-3.5" />
                      {q.answerCount > 0
                        ? t(q.answerCount === 1 ? "qa.answerOne" : "qa.answers", {
                            n: fmt.number(q.answerCount),
                          })
                        : t("qa.noAnswerYet")}
                    </span>
                    <time dateTime={q.createdAt.toISOString()}>{fmt.date(q.createdAt)}</time>
                  </div>
                </div>
                <ButtonLink
                  href={verified ? (`${href}#ans-body` as Route) : href}
                  variant={verified ? "brand" : "outline"}
                  size="sm"
                  className="relative z-10 shrink-0 max-sm:w-full"
                >
                  {verified ? <PenLine aria-hidden="true" /> : null}
                  {verified ? t("vetui.qa.answer") : t("vetui.qa.read")}
                </ButtonLink>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function QuestionsSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex gap-1.5 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-20 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="grid gap-2 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5"
          >
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VetQuestionsPage({ searchParams }: PageProps<"/[locale]/dashboard/questions">) {
  return (
    <SuspenseReveal fallback={<QuestionsSkeleton />}>
      <Questions searchParams={searchParams} />
    </SuspenseReveal>
  );
}
