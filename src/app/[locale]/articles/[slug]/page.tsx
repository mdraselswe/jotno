import { BadgeCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { JsonLd } from "@/components/ui/json-ld";
import { Skeleton } from "@/components/ui/skeleton";
import { localePath } from "@/config/locale";
import { articlePath, consultStartPath, pageUrl, ROUTES, vetPath } from "@/config/routes";
import { speciesName } from "@/content/places";
import { ArticleBody, readingMinutes } from "@/features/articles";
import { getArticle } from "@/features/articles/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

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
    },
  };
}

async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const a = await getArticle(slug);
  if (!a) notFound();
  return (
    <article className="grid gap-6">
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
      <nav className="text-sm">
        <Link
          href={localeHref(locale, ROUTES.articles)}
          className="text-muted-foreground hover:text-foreground"
        >
          ← {t("art.title")}
        </Link>
      </nav>
      <header className="grid gap-3">
        {a.speciesId ? (
          <span className="text-sm font-medium text-primary">{speciesName(a.speciesId, locale)}</span>
        ) : null}
        <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
          {a.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {a.publishedAt ? fmt.date(a.publishedAt) : null} ·{" "}
          {t("art.minutes", { n: fmt.number(readingMinutes(a.body)) })}
        </p>
      </header>
      <ArticleBody body={a.body} />
      <aside className="grid gap-3 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad) sm:flex sm:items-center">
        <Link href={localeHref(locale, vetPath(a.vet.slug))} className="flex flex-1 items-center gap-3">
          {a.vet.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- storage URL
            <img src={a.vet.photoUrl} alt="" className="size-12 rounded-full object-cover" />
          ) : null}
          <span className="grid">
            <span className="flex items-center gap-1 font-medium">
              {a.vetName}
              {a.vet.verified ? (
                <BadgeCheck aria-label={t("common.verified")} className="size-4 text-success" />
              ) : null}
            </span>
            {a.vet.title ? <span className="text-sm text-muted-foreground">{a.vet.title}</span> : null}
          </span>
        </Link>
        <ButtonLink href={localeHref(locale, consultStartPath(a.vet.slug))}>{t("vets.startChat")}</ButtonLink>
      </aside>
      <p className="text-xs text-muted-foreground">{t("footer.notAdvice")}</p>
    </article>
  );
}

export default function ArticlePage({ params }: PageProps<"/[locale]/articles/[slug]">) {
  return (
    <div className="container-page grid max-w-3xl py-8 md:py-12">
      <Suspense
        fallback={
          <div role="status" className="grid gap-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-96" />
          </div>
        }
      >
        <Article params={params} />
      </Suspense>
    </div>
  );
}
