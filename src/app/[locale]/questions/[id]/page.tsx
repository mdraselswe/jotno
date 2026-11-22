import { BadgeCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { JsonLd } from "@/components/ui/json-ld";
import { Skeleton } from "@/components/ui/skeleton";
import { pageUrl, questionPath, ROUTES, vetPath, consultStartPath } from "@/config/routes";
import { localePath } from "@/config/locale";
import { speciesName } from "@/content/places";
import { getViewer } from "@/features/auth/server";
import { AnswerForm, HelpfulButton, ReportButton } from "@/features/questions";
import { getQuestion } from "@/features/questions/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

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
    openGraph: { title: q.title, description: q.excerpt, url, type: "article" },
  };
}

async function Question({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await getViewer();
  const q = await getQuestion(id, viewer?.id ?? null);
  if (!q) notFound();
  const isVet = viewer?.role === "vet" || viewer?.role === "admin";

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
    <article className="grid gap-8">
      {q.answerCount > 0 ? <JsonLd data={ld} /> : null}
      <header className="grid gap-3">
        <nav className="text-sm">
          <Link
            href={localeHref(locale, ROUTES.questions)}
            className="text-muted-foreground hover:text-foreground"
          >
            ← {t("qa.title")}
          </Link>
        </nav>
        <h1 className="font-heading text-2xl leading-snug font-semibold tracking-tight md:text-3xl">
          {q.title}
        </h1>
        <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
          {q.speciesId ? <span>{speciesName(q.speciesId, locale)}</span> : null}
          <time dateTime={q.createdAt.toISOString()}>{fmt.date(q.createdAt)}</time>
        </p>
        <p className="text-pretty whitespace-pre-wrap">{q.body}</p>
        {q.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user photo from storage, static export has no optimiser
          <img
            src={q.photoUrl}
            alt=""
            className="max-h-96 w-auto justify-self-start rounded-(--radius-xl) object-contain"
          />
        ) : null}
        {viewer && !q.mine ? (
          <div className="justify-self-start">
            <ReportButton entity="question" id={q.id} />
          </div>
        ) : null}
      </header>

      <section className="grid gap-4" aria-labelledby="answers">
        <h2 id="answers" className="font-heading text-xl font-semibold">
          {q.answerCount > 0 ? t("qa.answers", { n: fmt.number(q.answerCount) }) : t("qa.noAnswerYet")}
        </h2>
        {q.answers.map((a) => (
          <div
            key={a.id}
            className="grid gap-3 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card)"
          >
            <Link href={localeHref(locale, vetPath(a.vet.slug))} className="flex items-center gap-3">
              {a.vet.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- storage URL
                <img src={a.vet.photoUrl} alt="" className="size-10 rounded-full object-cover" />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid size-10 place-items-center rounded-full bg-muted font-medium"
                >
                  {a.vet.name.slice(0, 1)}
                </span>
              )}
              <span className="grid">
                <span className="flex items-center gap-1 font-medium">
                  {a.vet.name}
                  {a.vet.verified ? (
                    <BadgeCheck aria-label={t("common.verified")} className="size-4 text-success" />
                  ) : null}
                </span>
                {a.vet.title ? <span className="text-xs text-muted-foreground">{a.vet.title}</span> : null}
              </span>
            </Link>
            <p className="text-pretty whitespace-pre-wrap">{a.body}</p>
            <div className="flex flex-wrap items-center gap-2">
              <HelpfulButton
                answerId={a.id}
                count={a.helpfulCount}
                voted={a.voted}
                canVote={Boolean(viewer)}
              />
              <ButtonLink href={localeHref(locale, consultStartPath(a.vet.slug))} variant="outline" size="sm">
                {t("vets.startChat")}
              </ButtonLink>
              {viewer ? <ReportButton entity="answer" id={a.id} /> : null}
              <span className="ml-auto text-xs text-muted-foreground">{fmt.date(a.createdAt)}</span>
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">{t("footer.notAdvice")}</p>
      </section>

      {isVet ? (
        <section className="grid gap-3 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-control)">
          <AnswerForm questionId={q.id} />
        </section>
      ) : null}
    </article>
  );
}

export default function QuestionPage({ params }: PageProps<"/[locale]/questions/[id]">) {
  return (
    <div className="container-page grid max-w-3xl py-8 md:py-12">
      <Suspense
        fallback={
          <div role="status" className="grid gap-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        }
      >
        <Question params={params} />
      </Suspense>
    </div>
  );
}
