import { BadgeCheck, Clock, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { questionPath } from "@/config/routes";
import { speciesName } from "@/content/places";
import type { Formatter, Translate } from "@/i18n";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";

export interface QuestionListItem {
  id: string;
  title: string;
  excerpt: string;
  speciesId: number | null;
  answerCount: number;
  createdAt: Date;
}

/**
 * Question cards linking to the question page: animal, "answered by a vet"
 * or "waiting", the title (the card's link), a short excerpt and the answer
 * count. Only verified vets answer, so any answer is a vet's.
 */
export function QuestionList({
  items,
  locale,
  t,
  fmt,
}: {
  items: QuestionListItem[];
  locale: string;
  t: Translate;
  fmt: Formatter;
}) {
  return (
    <ul className="grid gap-3">
      {items.map((q) => {
        const answered = q.answerCount > 0;
        return (
          <li key={q.id}>
            <article className="group glow-border relative grid gap-2.5 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card) ring-1 ring-foreground/6 transition-[box-shadow,translate] duration-(--motion-base) ease-(--ease-ui) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover)">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {answered ? (
                  <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success/15 px-2.5 font-semibold text-success dark:text-[color-mix(in_oklch,var(--success),white_35%)]">
                    <BadgeCheck aria-hidden="true" className="size-3.5" />
                    {t("pubui.qa.vetAnswered")}
                  </span>
                ) : (
                  <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warning/25 px-2.5 font-semibold text-warning-foreground dark:text-warning">
                    <Clock aria-hidden="true" className="size-3.5" />
                    {t("qa.unanswered")}
                  </span>
                )}
                {q.speciesId ? (
                  <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 font-medium text-foreground/80">
                    {speciesName(q.speciesId, locale)}
                  </span>
                ) : null}
                <time dateTime={q.createdAt.toISOString()} className="ms-auto text-muted-foreground">
                  {fmt.date(q.createdAt)}
                </time>
              </div>
              <h3 className="font-heading text-lg leading-snug font-semibold text-pretty">
                <Link
                  href={localeHref(locale, questionPath(q.id))}
                  className="rounded-sm group-hover:text-primary after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                >
                  {q.title}
                </Link>
              </h3>
              <p className="line-clamp-2 text-sm text-pretty text-muted-foreground">{q.excerpt}</p>
              <p
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm",
                  answered ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                <MessageSquareText
                  aria-hidden="true"
                  className={cn("size-4", answered ? "text-primary" : "text-muted-foreground")}
                />
                {answered
                  ? t(q.answerCount === 1 ? "qa.answerOne" : "qa.answers", { n: fmt.number(q.answerCount) })
                  : t("qa.noAnswerYet")}
              </p>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

/** QuestionList's loading twin. */
export function QuestionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="grid gap-3">
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="grid gap-2.5 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card) ring-1 ring-foreground/6"
        >
          <div className="flex gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
          <Skeleton className="h-[1lh] w-4/5 font-heading text-lg leading-snug" />
          <Skeleton className="h-[1lh] w-full text-sm" />
          <Skeleton className="h-[1lh] w-1/3 text-sm" />
        </li>
      ))}
    </ul>
  );
}
