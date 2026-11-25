import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Spot, type SpotName } from "@/components/illustrations/spots";
import { Skeleton } from "@/components/ui/skeleton";
import { articlePath } from "@/config/routes";
import { speciesName } from "@/content/places";
import type { Formatter, Translate } from "@/i18n";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";

export interface ArticleCardData {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  speciesId: number | null;
  publishedAt: Date | null;
  vetName: string;
}

const ART: readonly SpotName[] = ["care", "vet", "chat", "search", "welcome", "question"];
const SURFACES = ["surface-soft", "surface-warm", "surface-muted"] as const;

/** Guides have no photos: each gets a calm, stable cover (illustration + surface picked from its slug). */
function pick<T>(list: readonly T[], slug: string, salt = 0): T {
  let h = salt;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return list[h % list.length] ?? (list[0] as T);
}

export function ArticleCover({ slug, className }: { slug: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative grid place-items-center overflow-hidden dots",
        pick(SURFACES, slug, 7),
        className,
      )}
    >
      <Spot
        name={pick(ART, slug)}
        className="w-1/2 max-w-48 transition-transform duration-(--motion-slow) ease-out-expo group-hover:scale-105"
      />
    </div>
  );
}

function Meta({ a, t, fmt, locale }: { a: ArticleCardData; t: Translate; fmt: Formatter; locale: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground/80">{t("pubui.art.by", { name: a.vetName })}</span>
      {a.publishedAt ? (
        <>
          <span aria-hidden="true">·</span>
          <time dateTime={a.publishedAt.toISOString()}>{fmt.date(a.publishedAt)}</time>
        </>
      ) : null}
      {a.speciesId ? (
        <span className="ms-auto rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
          {speciesName(a.speciesId, locale)}
        </span>
      ) : null}
    </p>
  );
}

const LINK =
  "after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] group-hover:text-primary focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50";
const CARD =
  "group glow-border relative grid overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6 transition-[box-shadow,translate] duration-(--motion-base) ease-(--ease-ui) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover)";

/** A guide in the grid: cover, title, excerpt, author and date. */
export function ArticleCard({
  a,
  t,
  fmt,
  locale,
}: {
  a: ArticleCardData;
  t: Translate;
  fmt: Formatter;
  locale: string;
}) {
  return (
    <article className={cn(CARD, "h-full grid-rows-[auto_1fr]")}>
      <ArticleCover slug={a.slug} className="aspect-[16/9]" />
      <div className="grid content-between gap-3 p-(--card-pad)">
        <div className="grid gap-2">
          <h3 className="font-heading text-lg leading-snug font-semibold text-pretty">
            <Link href={localeHref(locale, articlePath(a.slug))} className={LINK}>
              {a.title}
            </Link>
          </h3>
          {a.excerpt ? (
            <p className="line-clamp-3 text-sm text-pretty text-muted-foreground">{a.excerpt}</p>
          ) : null}
        </div>
        <Meta a={a} t={t} fmt={fmt} locale={locale} />
      </div>
    </article>
  );
}

/** The newest guide, large, at the top of the list. */
export function ArticleFeature({
  a,
  t,
  fmt,
  locale,
}: {
  a: ArticleCardData;
  t: Translate;
  fmt: Formatter;
  locale: string;
}) {
  return (
    <article className={cn(CARD, "md:grid-cols-[1.1fr_1fr]")}>
      <ArticleCover slug={a.slug} className="aspect-[16/9] md:aspect-auto md:min-h-80" />
      <div className="grid content-center gap-4 p-6 md:p-10">
        <p className="justify-self-start rounded-full bg-highlight/30 px-3 py-1 text-xs font-semibold text-highlight-foreground dark:text-highlight">
          {t("pubui.art.latest")}
        </p>
        <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance md:text-4xl">
          <Link href={localeHref(locale, articlePath(a.slug))} className={LINK}>
            {a.title}
          </Link>
        </h2>
        {a.excerpt ? (
          <p className="line-clamp-4 text-pretty text-muted-foreground md:text-lg">{a.excerpt}</p>
        ) : null}
        <Meta a={a} t={t} fmt={fmt} locale={locale} />
        <span
          aria-hidden="true"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          {t("pubui.art.read")}
          <ArrowRight className="size-4 transition-transform duration-(--motion-fast) group-hover:translate-x-1 rtl:rotate-180" />
        </span>
      </div>
    </article>
  );
}

/** ArticleCard's loading twin. */
export function ArticleCardSkeleton() {
  return (
    <div className="grid h-full grid-rows-[auto_1fr] overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6">
      <Skeleton className="aspect-[16/9] rounded-none" />
      <div className="grid gap-2 p-(--card-pad)">
        <Skeleton className="h-[1lh] w-4/5 font-heading text-lg leading-snug" />
        <Skeleton className="h-[1lh] w-full text-sm" />
        <Skeleton className="h-[1lh] w-2/3 text-sm" />
        <Skeleton className="mt-2 h-[1lh] w-1/2 text-xs" />
      </div>
    </div>
  );
}
