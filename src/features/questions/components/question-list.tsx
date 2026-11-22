import { MessageSquareText } from "lucide-react";
import Link from "next/link";
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

/** Question cards linking to the question page. */
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
      {items.map((q) => (
        <li key={q.id}>
          <Link
            href={localeHref(locale, questionPath(q.id))}
            className="glow-border relative grid gap-2 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card) transition-colors hover:bg-muted/40"
          >
            <span className="font-heading text-lg leading-snug font-semibold">{q.title}</span>
            <span className="line-clamp-2 text-sm text-muted-foreground">{q.excerpt}</span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {q.speciesId ? (
                <span className="rounded-full bg-muted px-2 py-0.5">{speciesName(q.speciesId, locale)}</span>
              ) : null}
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  q.answerCount > 0 && "font-medium text-success",
                )}
              >
                <MessageSquareText aria-hidden="true" className="size-3.5" />
                {q.answerCount > 0 ? t("qa.answers", { n: fmt.number(q.answerCount) }) : t("qa.noAnswerYet")}
              </span>
              <span>{fmt.date(q.createdAt)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
