import { Newspaper } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
  DataTable,
  EmptyState,
  FilterPills,
  PageHeader,
  StatusBadge,
  type Column,
} from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { articlePath, ROUTES } from "@/config/routes";
import {
  AdminListSkeleton,
  AdminPager,
  ArticleControls,
  articleTone,
  listHref,
  pageParam,
} from "@/features/admin";
import { ADMIN_PAGE, adminMetadata, listArticles } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export async function generateMetadata() {
  return adminMetadata("manage.articles");
}

const FILTERS = ["all", "published", "draft"] as const;
type Filter = (typeof FILTERS)[number];
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Articles({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, locale, t, fmt] = await Promise.all([searchParams, getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminArticles));
  const raw = one(sp.status);
  const status: Filter = (FILTERS as readonly string[]).includes(raw) ? (raw as Filter) : "all";
  const page = pageParam(one(sp.page));
  const found = await listArticles(status, page);
  const rows = found.slice(0, ADMIN_PAGE);
  const more = found.length > ADMIN_PAGE;
  const base = localeHref(locale, ROUTES.adminArticles);
  const href = (p: { status?: Filter; page?: number }) =>
    listHref(base, { status: p.status ?? status, page: p.page ?? 1 }, { status: "all", page: 1 }) as Route;

  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    {
      key: "title",
      header: t("adminui.articles.title"),
      mobile: "title",
      cell: (a) => (
        <span className="grid min-w-0 gap-0.5">
          {a.status === "published" ? (
            <Link href={localeHref(locale, articlePath(a.slug))} className="line-clamp-2 hover:underline">
              {a.title}
            </Link>
          ) : (
            <span className="line-clamp-2">{a.title}</span>
          )}
          {a.isDemo ? (
            <span className="text-xs font-normal text-muted-foreground">{t("common.demo")}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (a) => <StatusBadge tone={articleTone(a.status)}>{t(`manage.article.${a.status}`)}</StatusBadge>,
    },
    { key: "vet", header: t("adminui.articles.author"), cell: (a) => a.vet },
    {
      key: "date",
      header: t("common.date"),
      className: "whitespace-nowrap text-muted-foreground",
      cell: (a) => fmt.date(a.publishedAt ?? a.updatedAt),
    },
    {
      key: "actions",
      header: <span className="sr-only">{t("common.actions")}</span>,
      className: "text-end",
      cell: (a) => <ArticleControls id={a.id} published={a.status === "published"} title={a.title} />,
    },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title={t("manage.articles")} sub={t("manage.articlesSub")} icon={Newspaper} />
      <FilterPills
        label={t("common.status")}
        items={FILTERS.map((f) => ({
          href: href({ status: f }),
          label: f === "all" ? t("common.all") : t(`manage.article.${f}`),
          active: f === status,
        }))}
      />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(a) => a.id}
        caption={t("manage.articles")}
        empty={
          <EmptyState
            icon={Newspaper}
            title={t("adminui.articles.empty")}
            body={t("adminui.articles.emptyBody")}
          />
        }
      />
      <AdminPager
        page={page}
        prevHref={page > 1 ? href({ page: page - 1 }) : undefined}
        nextHref={more ? href({ page: page + 1 }) : undefined}
        label={t("adminui.pages")}
        prev={t("adminui.prev")}
        next={t("adminui.next")}
        pageLabel={t("common.page", { n: fmt.number(page) })}
      />
    </div>
  );
}

export default async function AdminArticlesPage({ searchParams }: PageProps<"/[locale]/admin/articles">) {
  const t = await getT();
  return (
    <SuspenseReveal fallback={<AdminListSkeleton label={t("loading.label")} search={false} rows={6} />}>
      <Articles searchParams={searchParams} />
    </SuspenseReveal>
  );
}
