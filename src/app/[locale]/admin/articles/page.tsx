import Link from "next/link";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { articlePath, ROUTES } from "@/config/routes";
import { ArticleControls, FilterChips } from "@/features/admin";
import { listArticles } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Admin · Articles", robots: { index: false } };

const FILTERS = ["all", "published", "draft"] as const;
type Filter = (typeof FILTERS)[number];
type SP = Record<string, string | string[] | undefined>;

async function Articles({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, locale, t, fmt] = await Promise.all([searchParams, getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminArticles));
  const raw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status: Filter = (FILTERS as readonly string[]).includes(raw ?? "") ? (raw as Filter) : "all";
  const rows = await listArticles(status);
  const base = localeHref(locale, ROUTES.adminArticles);
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("manage.articles")} sub={t("manage.articlesSub")} />
      <FilterChips
        label={t("manage.status")}
        items={FILTERS.map((f) => ({
          href: f === "all" ? base : `${base}/?status=${f}`,
          label: f === "all" ? t("common.all") : t(`manage.article.${f}`),
          active: f === status,
        }))}
      />
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.empty")}</p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-(--control-radius) bg-card px-4 py-3 shadow-(--shadow-card)"
            >
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {a.status === "published" ? (
                    <Link href={localeHref(locale, articlePath(a.slug))} className="hover:underline">
                      {a.title}
                    </Link>
                  ) : (
                    a.title
                  )}
                  <Badge variant={a.status === "published" ? "default" : "secondary"}>
                    {t(`manage.article.${a.status}`)}
                  </Badge>
                  {a.isDemo ? <span className="text-xs text-muted-foreground">(demo)</span> : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  {a.vet} · {fmt.date(a.publishedAt ?? a.updatedAt)}
                </span>
              </span>
              <ArticleControls id={a.id} published={a.status === "published"} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminArticlesPage({ searchParams }: PageProps<"/[locale]/admin/articles">) {
  return (
    <Private rows={6}>
      <Articles searchParams={searchParams} />
    </Private>
  );
}
