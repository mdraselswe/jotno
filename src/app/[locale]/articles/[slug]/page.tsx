import { ArrowLeft, BadgeCheck, Clock, MessageCircle, Stethoscope } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StatusBadge } from "@/components/layout/app-ui";
import { ButtonLink } from "@/components/ui/button-link";
import { JsonLd } from "@/components/ui/json-ld";
import { Skeleton } from "@/components/ui/skeleton";
import { localePath } from "@/config/locale";
import { articlePath, consultStartPath, pageUrl, ROUTES, vetPath } from "@/config/routes";
import { speciesName } from "@/content/places";
import {
  ArticleBody,
  ArticleCard,
  ArticleCardSkeleton,
  articleHeadings,
  headingId,
  readingMinutes,
} from "@/features/articles";
import { getArticle, listArticles } from "@/features/articles/server";
import { ShareButton } from "@/features/share";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { ogImages } from "@/lib/og";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/articles/[slug]">): Promise<Metadata> {
  const { slug, locale } = await params;
  const a = await getArticle(slug);
  if (!a) return { robots: { index: false } };
  const url = pageUrl(localePath(locale, articlePath(slug)));
  const description = a.excerpt ?? a.body.slice(0, 160);
  return {
    title: a.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: a.title,
      description,
      url,
      type: "article",
      publishedTime: a.publishedAt?.toISOString(),
      images: ogImages(),
    },
  };
}

function VetAvatar({ photoUrl, className }: { photoUrl: string | null; className: string }) {
  return photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- storage URL at a small fixed size
    <img src={photoUrl} alt="" className={cn("shrink-0 rounded-full object-cover", className)} />
  ) : (
    <span
      aria-hidden="true"
      className={cn("grid shrink-0 place-items-center rounded-full bg-primary/10 text-primary", className)}
    >
      <Stethoscope className="size-1/2" />
    </span>
  );
}

/** Up to three other guides, about the same animal when there is one. */
async function MoreGuides({ slug, speciesId }: { slug: string; speciesId: number | null }) {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { items } = await listArticles({ speciesId, page: 1 });
  const more = items.filter((x) => x.slug !== slug).slice(0, 3);
  if (more.length === 0) return null;
  return (
    <section className="grid gap-5" aria-labelledby="more-guides">
      <div className="flex items-end justify-between gap-3">
        <h2
          id="more-guides"
          className="min-w-0 font-heading text-2xl font-bold tracking-tight text-balance md:text-3xl"
        >
          {t("pubui.art.more")}
        </h2>
        <Link
          href={localeHref(locale, ROUTES.articles)}
          className="shrink-0 pb-1 text-sm font-medium whitespace-nowrap text-primary hover:underline"
        >
          {t("common.seeAll")}
        </Link>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {more.map((x) => (
          <li key={x.id}>
            <ArticleCard a={x} t={t} fmt={fmt} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const a = await getArticle(slug);
  if (!a) notFound();
  const headings = articleHeadings(a.body);
  const profile = localeHref(locale, vetPath(a.vet.slug));
  const edited = a.publishedAt && a.updatedAt.getTime() - a.publishedAt.getTime() > 86_400_000;

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          datePublished: a.publishedAt?.toISOString(),
          dateModified: a.updatedAt.toISOString(),
          author: { "@type": "Person", name: a.vetName },
        }}
      />
      <header data-no-reveal className="surface-warm dots">
        <div className="container-page grid max-w-4xl gap-5 pt-6 pb-10 md:pt-8 md:pb-14">
          <nav>
            <Link
              href={localeHref(locale, ROUTES.articles)}
              className="inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-(--shadow-control) transition-colors hover:text-foreground"
            >
              <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
              {t("art.title")}
            </Link>
          </nav>
          {a.speciesId ? <StatusBadge tone="primary">{speciesName(a.speciesId, locale)}</StatusBadge> : null}
          <h1 className="font-heading text-3xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-4xl md:text-5xl">
            {a.title}
          </h1>
          {a.excerpt ? (
            <p className="max-w-2xl text-lg text-pretty text-foreground/75 md:text-xl">{a.excerpt}</p>
          ) : null}
          <ShareButton
            className="justify-self-start"
            title={a.title}
            text={t("share.articleText", { title: a.title })}
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Link href={profile} className="group flex items-center gap-2.5">
              <VetAvatar photoUrl={a.vet.photoUrl} className="size-10" />
              <span className="grid leading-tight">
                <span className="flex items-center gap-1 font-semibold group-hover:text-primary">
                  {a.vetName}
                  {a.vet.verified ? (
                    <BadgeCheck aria-label={t("common.verified")} className="size-4 text-primary" />
                  ) : null}
                </span>
                {a.publishedAt ? (
                  <time dateTime={a.publishedAt.toISOString()} className="text-xs text-foreground/65">
                    {fmt.date(a.publishedAt)}
                  </time>
                ) : null}
              </span>
            </Link>
            <span className="inline-flex items-center gap-1.5 text-foreground/70">
              <Clock aria-hidden="true" className="size-4" />
              {t("art.minutes", { n: fmt.number(readingMinutes(a.body)) })}
            </span>
          </div>
        </div>
      </header>

      <div className="container-page grid max-w-6xl grid-cols-1 gap-10 py-10 md:py-14 xl:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="mx-auto grid w-full max-w-[68ch] min-w-0 gap-10 xl:mx-0 xl:ms-auto">
          <ArticleBody body={a.body} />
          {edited ? (
            <p className="text-sm text-muted-foreground">
              {t("pubui.art.updated", { date: fmt.date(a.updatedAt) })}
            </p>
          ) : null}

          <aside
            aria-labelledby="author-h"
            className="grid gap-4 rounded-(--radius-2xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-6"
          >
            <h2 id="author-h" className="text-xs font-semibold text-muted-foreground uppercase">
              {t("pubui.art.aboutAuthor")}
            </h2>
            <div className="flex items-center gap-4">
              <VetAvatar photoUrl={a.vet.photoUrl} className="size-16" />
              <div className="grid min-w-0 gap-0.5">
                <p className="flex items-center gap-1.5 font-heading text-lg font-semibold">
                  <span className="truncate">{a.vetName}</span>
                  {a.vet.verified ? (
                    <BadgeCheck
                      aria-label={t("common.verified")}
                      className="size-4.5 shrink-0 text-primary"
                    />
                  ) : null}
                </p>
                {a.vet.title ? <p className="text-sm text-muted-foreground">{a.vet.title}</p> : null}
              </div>
            </div>
            <p className="text-sm text-pretty">{t("pubui.art.askAuthor", { name: a.vetName })}</p>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={localeHref(locale, consultStartPath(a.vet.slug))} variant="brand">
                <MessageCircle aria-hidden="true" />
                {t("vets.chatNow")}
              </ButtonLink>
              <ButtonLink href={profile} variant="outline">
                {t("pubui.art.profile")}
              </ButtonLink>
            </div>
          </aside>
          <p className="text-xs text-muted-foreground">{t("footer.notAdvice")}</p>
        </div>

        {headings.length >= 2 ? (
          <nav aria-labelledby="toc-h" className="max-xl:hidden xl:sticky xl:top-24 xl:self-start">
            <p id="toc-h" className="mb-3 text-xs font-semibold text-muted-foreground uppercase">
              {t("pubui.legal.toc")}
            </p>
            <ol className="grid gap-1 border-s border-foreground/10 text-sm">
              {headings.map((h, i) => (
                <li key={headingId(i)}>
                  <a
                    href={`#${headingId(i)}`}
                    className="-ms-px block border-s-2 border-transparent py-1 ps-4 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {h}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
      </div>

      <div className="container-page pb-16">
        <Suspense
          fallback={
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <MoreGuides slug={a.slug} speciesId={a.speciesId} />
        </Suspense>
      </div>
    </article>
  );
}

function ArticleSkeleton() {
  return (
    <div role="status">
      <div className="surface-warm">
        <div className="container-page grid max-w-4xl gap-5 pt-6 pb-10 md:pt-8 md:pb-14">
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-[1lh] w-4/5 font-heading text-3xl leading-[1.1] sm:text-4xl md:text-5xl" />
          <Skeleton className="h-[1lh] w-3/5 text-lg md:text-xl" />
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <div className="container-page grid max-w-[68ch] gap-4 py-10 md:py-14">
        {["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-10/12", "w-full", "w-3/5"].map((w, i) => (
          <Skeleton key={i} className={cn("h-[1lh] text-lg", w)} />
        ))}
      </div>
    </div>
  );
}

export default function ArticlePage({ params }: PageProps<"/[locale]/articles/[slug]">) {
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      <Article params={params} />
    </Suspense>
  );
}
