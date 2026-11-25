import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  MessageCircle,
  MessageCircleQuestion,
  PenLine,
  Siren,
  Stethoscope,
} from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EmptyState, SectionCard, StatusBadge } from "@/components/layout/app-ui";
import { ButtonLink } from "@/components/ui/button-link";
import { JsonLd } from "@/components/ui/json-ld";
import { Skeleton } from "@/components/ui/skeleton";
import { localePath } from "@/config/locale";
import { consultStartPath, pageUrl, questionPath, ROUTES, vetPath } from "@/config/routes";
import { speciesName } from "@/content/places";
import { getViewer } from "@/features/auth/server";
import { AnswerForm, HelpfulButton, ReportButton } from "@/features/questions";
import { answeringVet, getQuestion } from "@/features/questions/server";
import { ShareButton } from "@/features/share";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { ogImages } from "@/lib/og";

export async function generateMetadata({ params }: PageProps<"/[locale]/questions/[id]">): Promise<Metadata> {
  const { id, locale } = await params;
  const q = await getQuestion(id, null);
  if (!q) return { robots: { index: false } };
  const url = pageUrl(localePath(locale, questionPath(id)));
  return {
    title: q.title,
    description: q.excerpt,
    alternates: { canonical: url },
    robots: q.answerCount > 0 ? undefined : { index: false },
    openGraph: { title: q.title, description: q.excerpt, url, type: "article", images: ogImages() },
  };
}

function VetAvatar({ photoUrl }: { photoUrl: string | null }) {
  return photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- storage URL at a small fixed size
    <img src={photoUrl} alt="" className="size-11 shrink-0 rounded-full object-cover" loading="lazy" />
  ) : (
    <span
      aria-hidden="true"
      className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
    >
      <Stethoscope className="size-5" />
    </span>
  );
}

async function Question({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await getViewer();
  const [q, vet] = await Promise.all([getQuestion(id, viewer?.id ?? null), answeringVet(viewer)]);
  if (!q) notFound();
  // Only someone the answer action accepts (a verified vet profile) sees the form.
  const canAnswer = vet !== null;
  const answered = q.answers.length > 0;

  const ld = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: q.title,
      text: q.body,
      answerCount: q.answerCount,
      dateCreated: q.createdAt.toISOString(),
      ...(q.answers[0]
        ? {
            acceptedAnswer: {
              "@type": "Answer",
              text: q.answers[0].body,
              upvoteCount: q.answers[0].helpfulCount,
              dateCreated: q.answers[0].createdAt.toISOString(),
              author: { "@type": "Person", name: q.answers[0].vet.name },
            },
          }
        : {}),
    },
  };

  return (
    <article>
      {q.answerCount > 0 ? <JsonLd data={ld} /> : null}
      <header data-no-reveal className="surface-soft dots">
        <div className="container-page grid gap-4 pt-6 pb-10 md:pt-8 md:pb-12">
          <nav>
            <Link
              href={localeHref(locale, ROUTES.questions)}
              className="inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-(--shadow-control) transition-colors hover:text-foreground"
            >
              <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
              {t("qa.title")}
            </Link>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            {answered ? (
              <StatusBadge tone="success">{t("pubui.qa.vetAnswered")}</StatusBadge>
            ) : (
              <StatusBadge tone="warning">{t("qa.unanswered")}</StatusBadge>
            )}
            {q.speciesId ? <StatusBadge>{speciesName(q.speciesId, locale)}</StatusBadge> : null}
          </div>
          <h1 className="max-w-3xl font-heading text-3xl leading-tight font-bold tracking-tight text-balance md:text-4xl">
            {q.title}
          </h1>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              <time dateTime={q.createdAt.toISOString()}>
                {t("pubui.qa.asked", { date: fmt.date(q.createdAt) })}
              </time>
            </p>
            <ShareButton title={q.title} text={t("share.questionText")} />
          </div>
        </div>
      </header>

      <div className="container-page grid grid-cols-1 gap-8 py-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="grid min-w-0 gap-6">
          {/* The question */}
          <section
            aria-label={q.title}
            className="grid gap-4 rounded-(--radius-2xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-6"
          >
            <p className="leading-relaxed text-pretty whitespace-pre-wrap">{q.body}</p>
            {q.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user photo from storage
              <img
                src={q.photoUrl}
                alt=""
                className="max-h-96 w-auto max-w-full justify-self-start rounded-(--radius-xl) object-contain ring-1 ring-foreground/8"
              />
            ) : null}
            {viewer && !q.mine ? (
              <div className="justify-self-end">
                <ReportButton entity="question" id={q.id} />
              </div>
            ) : null}
          </section>

          {/* Answers */}
          <section className="grid gap-4" aria-labelledby="answers">
            <h2 id="answers" className="flex items-center gap-2 font-heading text-xl font-semibold">
              <MessageCircle aria-hidden="true" className="size-5 text-primary" />
              {answered
                ? t(q.answerCount === 1 ? "qa.answerOne" : "qa.answers", { n: fmt.number(q.answerCount) })
                : t("qa.noAnswerYet")}
            </h2>
            {answered ? (
              <ol className="grid gap-4">
                {q.answers.map((a) => (
                  <li
                    key={a.id}
                    className="relative grid gap-4 overflow-hidden rounded-(--radius-2xl) bg-card p-5 ps-6 shadow-(--shadow-card) ring-1 ring-success/25 sm:p-6 sm:ps-7"
                  >
                    <span aria-hidden="true" className="absolute inset-y-0 start-0 w-1.5 bg-success" />
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <Link
                        href={localeHref(locale, vetPath(a.vet.slug))}
                        className="group flex min-w-0 items-center gap-3"
                      >
                        <VetAvatar photoUrl={a.vet.photoUrl} />
                        <span className="grid min-w-0">
                          <span className="flex items-center gap-1 font-semibold group-hover:text-primary">
                            <span className="truncate">{a.vet.name}</span>
                            {a.vet.verified ? (
                              <BadgeCheck
                                aria-label={t("common.verified")}
                                className="size-4 shrink-0 text-primary"
                              />
                            ) : null}
                          </span>
                          {a.vet.title ? (
                            <span className="truncate text-xs text-muted-foreground">{a.vet.title}</span>
                          ) : null}
                        </span>
                      </Link>
                      {a.vet.verified ? (
                        <StatusBadge tone="success">{t("pubui.qa.vetAnswer")}</StatusBadge>
                      ) : null}
                    </div>
                    <p className="leading-relaxed text-pretty whitespace-pre-wrap">{a.body}</p>
                    <div className="flex flex-wrap items-center gap-2 border-t border-foreground/8 pt-3">
                      <HelpfulButton
                        answerId={a.id}
                        count={a.helpfulCount}
                        voted={a.voted}
                        canVote={Boolean(viewer)}
                      />
                      <ButtonLink
                        href={localeHref(locale, consultStartPath(a.vet.slug))}
                        variant="outline"
                        size="sm"
                        aria-label={t("pubui.qa.chatWith", { name: a.vet.name })}
                      >
                        <MessageCircle aria-hidden="true" />
                        {t("vets.chatNow")}
                      </ButtonLink>
                      {viewer ? <ReportButton entity="answer" id={a.id} /> : null}
                      <time
                        dateTime={a.createdAt.toISOString()}
                        className="ms-auto text-xs text-muted-foreground"
                      >
                        {fmt.date(a.createdAt)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                icon={Clock}
                title={t("pubui.qa.waitTitle")}
                body={t("pubui.qa.waitBody")}
                action={
                  <ButtonLink href={`${localeHref(locale, ROUTES.vets)}/?now=1` as Route} variant="brand">
                    <MessageCircle aria-hidden="true" />
                    {t("pubui.emg.chatNow")}
                  </ButtonLink>
                }
              />
            )}
            <p className="text-xs text-muted-foreground">{t("footer.notAdvice")}</p>
          </section>

          {canAnswer ? (
            <SectionCard
              title={t("pubui.qa.answerTitle")}
              description={t("pubui.qa.answerSub")}
              icon={PenLine}
            >
              <AnswerForm questionId={q.id} />
            </SectionCard>
          ) : null}
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <section className="grid gap-3 rounded-(--radius-2xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6">
            <h2 className="font-heading text-base font-semibold">{t("account.quickAsk")}</h2>
            <p className="text-sm text-pretty text-muted-foreground">{t("pubui.qa.how1")}</p>
            <ButtonLink href={localeHref(locale, ROUTES.ask)} variant="outline" className="w-full">
              <MessageCircleQuestion aria-hidden="true" />
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
    </article>
  );
}

function QuestionSkeleton() {
  return (
    <div role="status">
      <div className="surface-soft">
        <div className="container-page grid gap-4 pt-6 pb-10 md:pt-8 md:pb-12">
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-6 w-36 rounded-full" />
          <Skeleton className="h-[1lh] w-3/4 font-heading text-3xl leading-tight md:text-4xl" />
          <Skeleton className="h-[1lh] w-40 text-sm" />
        </div>
      </div>
      <div className="container-page grid gap-8 py-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="grid gap-6">
          <Skeleton className="h-36 rounded-(--radius-2xl)" />
          <Skeleton className="h-[1lh] w-40 font-heading text-xl" />
          <Skeleton className="h-56 rounded-(--radius-2xl)" />
        </div>
        <Skeleton className="h-44 rounded-(--radius-2xl) max-lg:hidden" />
      </div>
    </div>
  );
}

export default function QuestionPage({ params }: PageProps<"/[locale]/questions/[id]">) {
  return (
    <Suspense fallback={<QuestionSkeleton />}>
      <Question params={params} />
    </Suspense>
  );
}
