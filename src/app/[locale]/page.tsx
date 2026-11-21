import { BadgeCheck, HeartPulse, MessageCircle, Search, Siren, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { Mishu } from "@/components/brand/mishu";
import { NumberTicker } from "@/components/motion/number-ticker";
import { PageTransition } from "@/components/motion/page-transition";
import { ButtonLink } from "@/components/ui/button-link";
import { RichText } from "@/components/ui/rich-text";
import { Skeleton } from "@/components/ui/skeleton";
import { articlePath, ROUTES } from "@/config/routes";
import { homeContent, type StepIcon } from "@/content/home";
import { listArticles } from "@/features/articles/server";
import { HomeSearch, VetCard, VetDotMap } from "@/features/providers";
import { liveStats, searchProviders } from "@/features/providers/server";
import { QuestionList } from "@/features/questions";
import { answeredHighlights } from "@/features/questions/server";
import { pickLocale } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

const STEP_ICONS: Record<StepIcon, LucideIcon> = { search: Search, chat: MessageCircle, heart: HeartPulse };

async function LivePanel() {
  const t = await getT();
  const stats = await liveStats();
  return (
    <div className="grid gap-4 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad) shadow-(--shadow-card)">
      <p className="flex items-baseline gap-2">
        <span className="relative flex size-2.5 self-center">
          <span className="absolute inline-flex size-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2.5 rounded-full bg-success" />
        </span>
        <span className="font-heading text-4xl font-semibold tabular-nums">
          <NumberTicker value={stats.online} />
        </span>
        <span className="text-muted-foreground">{t("home.onlineNow")}</span>
      </p>
      <VetDotMap dots={stats.dots} label={t("home.mapLabel")} />
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground tabular-nums">
          <NumberTicker value={stats.verified} />
        </span>{" "}
        {t("home.verifiedVets")}
      </p>
    </div>
  );
}

async function FeaturedVets() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { featured, results } = await searchProviders({ page: 1, pageSize: 4 });
  const vets = [...featured, ...results].slice(0, 4);
  if (vets.length === 0) return null;
  return (
    <section className="container-page grid gap-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          {t("home.vetsTitle")}
        </h2>
        <ButtonLink href={localeHref(locale, ROUTES.vets)} variant="outline">
          {t("common.seeAll")}
        </ButtonLink>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {vets.map((v) => (
          <li key={v.id}>
            <VetCard vet={v} locale={locale} t={t} fmt={fmt} />
          </li>
        ))}
      </ul>
    </section>
  );
}

async function CommunityRow() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const [questions, { items: articles }] = await Promise.all([
    answeredHighlights(3),
    listArticles({ page: 1 }),
  ]);
  if (questions.length === 0 && articles.length === 0) return null;
  return (
    <section className="container-page grid gap-10 py-12 lg:grid-cols-2">
      {questions.length > 0 ? (
        <div className="grid content-start gap-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">{t("qa.highlights")}</h2>
            <ButtonLink href={localeHref(locale, ROUTES.ask)} size="sm">
              {t("qa.ask")}
            </ButtonLink>
          </div>
          <QuestionList items={questions} locale={locale} t={t} fmt={fmt} />
        </div>
      ) : null}
      {articles.length > 0 ? (
        <div className="grid content-start gap-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">{t("art.title")}</h2>
            <Link href={localeHref(locale, ROUTES.articles)} className="text-sm text-primary hover:underline">
              {t("common.seeAll")}
            </Link>
          </div>
          <ul className="grid gap-3">
            {articles.slice(0, 3).map((a) => (
              <li key={a.id}>
                <Link
                  href={localeHref(locale, articlePath(a.slug))}
                  className="grid gap-1 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad) transition-colors hover:bg-muted/40"
                >
                  <span className="font-medium">{a.title}</span>
                  {a.excerpt ? (
                    <span className="line-clamp-2 text-sm text-muted-foreground">{a.excerpt}</span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">{a.vetName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getT();
  const c = pickLocale(homeContent, locale);
  return (
    <PageTransition>
      <section className="container-page grid items-center gap-10 py-12 md:py-20 lg:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-6">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <BadgeCheck aria-hidden="true" className="size-4" />
            {c.hero.eyebrow}
          </p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            <RichText text={c.hero.title} />
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">{c.hero.body}</p>
          <HomeSearch />
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {c.trust.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <BadgeCheck aria-hidden="true" className="size-4 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <Suspense fallback={<Skeleton className="aspect-[5/6] rounded-(--radius-xl)" />}>
          <LivePanel />
        </Suspense>
      </section>

      <section className="container-page py-12">
        <ol className="grid gap-4 md:grid-cols-3">
          {c.steps.map((s, i) => {
            const Icon = STEP_ICONS[s.icon];
            return (
              <li
                key={s.title}
                className="grid reveal gap-2 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad)"
                style={{ "--i": i } as CSSProperties}
              >
                <Icon aria-hidden="true" className="size-6 text-primary" />
                <h2 className="font-heading text-lg font-semibold">{s.title}</h2>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <Suspense
        fallback={
          <div className="container-page py-12">
            <Skeleton className="h-64 rounded-(--radius-xl)" />
          </div>
        }
      >
        <FeaturedVets />
      </Suspense>

      <section className="container-page py-6">
        <div className="flex flex-wrap items-center gap-4 rounded-(--radius-xl) border-(length:--border-w) border-destructive/40 bg-destructive/5 p-(--card-pad)">
          <Siren aria-hidden="true" className="size-8 text-destructive" />
          <div className="grid flex-1 gap-1">
            <h2 className="font-heading text-lg font-semibold">{c.emergency.title}</h2>
            <p className="text-sm text-muted-foreground">{c.emergency.body}</p>
          </div>
          <ButtonLink href={localeHref(locale, ROUTES.emergency)} variant="destructive">
            {c.emergency.button}
          </ButtonLink>
        </div>
      </section>

      <Suspense fallback={null}>
        <CommunityRow />
      </Suspense>

      <section className="container-page py-16">
        <div className="grid items-center gap-6 rounded-(--radius-xl) bg-primary/5 p-8 md:grid-cols-[auto_1fr_auto] md:p-12">
          <Mishu mood="happy" className="size-24" />
          <div className="grid gap-2">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">{c.vetCta.title}</h2>
            <p className="max-w-xl text-muted-foreground">{c.vetCta.body}</p>
          </div>
          <ButtonLink href={localeHref(locale, ROUTES.forVets)} size="lg">
            {c.vetCta.button}
          </ButtonLink>
        </div>
      </section>
      <p className="sr-only">{t("meta.description")}</p>
    </PageTransition>
  );
}
