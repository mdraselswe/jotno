import { FilePen, FileText, Globe, NotebookPen, Plus } from "lucide-react";
import {
  DataTable,
  EmptyState,
  PageHeader,
  StatCard,
  StatGrid,
  StatusBadge,
  type Column,
} from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES, vetArticlePath } from "@/config/routes";
import { myArticles } from "@/features/articles/server";
import { requireVet } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("vet.articles"), robots: { index: false } };
}

type Article = Awaited<ReturnType<typeof myArticles>>[number];

async function Articles() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { provider } = await requireVet(locale, localeHref(locale, ROUTES.vetArticles));
  const items = await myArticles(provider.id);
  const published = items.filter((a) => a.status === "published").length;

  const columns: Column<Article>[] = [
    {
      key: "title",
      header: t("art.titleField"),
      mobile: "title",
      cell: (a) => <span className="line-clamp-2 font-medium text-pretty">{a.title}</span>,
    },
    {
      key: "status",
      header: t("vetui.earn.status"),
      className: "w-32",
      cell: (a) =>
        a.status === "published" ? (
          <StatusBadge tone="success">{t("art.statusPublished")}</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">{t("art.statusDraft")}</StatusBadge>
        ),
    },
    {
      key: "updated",
      header: t("common.date"),
      className: "w-40 whitespace-nowrap text-muted-foreground",
      cell: (a) => (
        <time
          dateTime={a.updatedAt.toISOString()}
          title={t("vetui.art.updated", { date: fmt.date(a.updatedAt) })}
        >
          {fmt.date(a.updatedAt)}
        </time>
      ),
    },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={NotebookPen}
        title={t("vet.articles")}
        sub={t("art.vetSub")}
        actions={
          <ButtonLink
            href={localeHref(locale, ROUTES.vetNewArticle)}
            variant="brand"
            className="max-sm:flex-1"
          >
            <Plus aria-hidden="true" />
            {t("art.new")}
          </ButtonLink>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={FilePen}
          title={t("art.mineEmpty")}
          body={t("vetui.art.emptyBody")}
          action={
            <ButtonLink href={localeHref(locale, ROUTES.vetNewArticle)} variant="brand">
              <Plus aria-hidden="true" />
              {t("vetui.art.write")}
            </ButtonLink>
          }
        />
      ) : (
        <>
          <StatGrid className="md:grid-cols-2 xl:grid-cols-2">
            <StatCard
              label={t("vetui.art.published")}
              value={fmt.number(published)}
              icon={Globe}
              tone={published > 0 ? "success" : "default"}
            />
            <StatCard
              label={t("vetui.art.drafts")}
              value={fmt.number(items.length - published)}
              icon={FileText}
            />
          </StatGrid>
          <DataTable
            rows={items}
            columns={columns}
            rowKey={(a) => a.id}
            rowHref={(a) => localeHref(locale, vetArticlePath(a.id))}
            caption={t("vet.articles")}
          />
        </>
      )}
    </div>
  );
}

function ArticlesSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-(--control-h) w-32 rounded-(--control-radius)" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 rounded-(--radius-2xl)" />
        <Skeleton className="h-28 rounded-(--radius-2xl)" />
      </div>
      <div className="grid gap-px overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-28 max-md:hidden" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VetArticlesPage() {
  return (
    <SuspenseReveal fallback={<ArticlesSkeleton />}>
      <Articles />
    </SuspenseReveal>
  );
}
