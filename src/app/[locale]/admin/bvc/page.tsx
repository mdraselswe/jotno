import { BookCheck, FileSpreadsheet, ListPlus, SearchX } from "lucide-react";
import type { Route } from "next";
import {
  DataTable,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatGrid,
  type Column,
} from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ROUTES } from "@/config/routes";
import { AdminListSkeleton, AdminSearch, BvcEntryForm, listHref, RemoveBvcButton } from "@/features/admin";
import { adminMetadata, bvcOverview, bvcSearch } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export async function generateMetadata() {
  return adminMetadata("adminui.bvc.title");
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Register({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, locale, t, fmt] = await Promise.all([searchParams, getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminBvc));
  const q = one(sp.q).trim().slice(0, 60);
  const [overview, rows] = await Promise.all([bvcOverview(), bvcSearch(q)]);
  const base = localeHref(locale, ROUTES.adminBvc);
  const dash = "—";

  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "no", header: t("adminui.bvc.regNo"), className: "font-mono text-xs", cell: (r) => r.regNo },
    {
      key: "name",
      header: t("adminui.bvc.name"),
      mobile: "title",
      cell: (r) => <span lang="bn">{r.nameBn ?? t("adminui.bvc.status.unreadable")}</span>,
    },
    { key: "division", header: t("adminui.bvc.division"), cell: (r) => r.division ?? dash },
    {
      key: "source",
      header: t("adminui.bvc.source"),
      className: "text-xs text-muted-foreground",
      cell: (r) =>
        [
          r.sourceManual || !r.sourceTitle ? t("adminui.bvc.manual") : r.sourceTitle,
          r.page ? t("adminui.bvc.page", { n: fmt.number(r.page) }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
    },
    {
      key: "remove",
      header: <span className="sr-only">{t("adminui.bvc.remove")}</span>,
      cell: (r) => <RemoveBvcButton regKey={r.regKey} regNo={r.regNo} />,
    },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title={t("adminui.bvc.title")} sub={t("adminui.bvc.sub")} icon={BookCheck} />
      <StatGrid>
        <StatCard label={t("adminui.bvc.total")} value={fmt.number(overview.total)} />
        <StatCard
          label={t("adminui.bvc.unreadable")}
          value={fmt.number(overview.unreadable)}
          tone={overview.unreadable > 0 ? "warning" : "default"}
        />
      </StatGrid>

      <div className="grid gap-3">
        <AdminSearch
          action={base}
          q={q}
          label={t("adminui.bvc.search")}
          placeholder={t("adminui.bvc.search")}
          submit={t("manage.search")}
          clear={t("adminui.clearSearch")}
          clearHref={listHref(base, {}) as Route}
        />
        {q ? (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.regKey}
            caption={t("adminui.bvc.title")}
            empty={
              <EmptyState
                icon={SearchX}
                title={t("adminui.bvc.searchEmpty", { q })}
                body={t("adminui.bvc.explain.notFound")}
              />
            }
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t("adminui.bvc.searchHint")}</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <SectionCard title={t("adminui.bvc.add")} description={t("adminui.bvc.addHint")} icon={ListPlus}>
          <BvcEntryForm />
        </SectionCard>
        <SectionCard title={t("adminui.bvc.sources")} icon={FileSpreadsheet}>
          <div className="grid gap-4">
            {overview.sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("adminui.bvc.noSources")}</p>
            ) : (
              <ul className="grid gap-3">
                {overview.sources.map((s) => (
                  <li key={s.id} className="grid gap-0.5 text-sm">
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-pretty underline underline-offset-4"
                      >
                        {s.title}
                      </a>
                    ) : (
                      <span className="font-medium text-pretty">
                        {s.manual ? t("adminui.bvc.manual") : s.title}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {[
                        s.publishedOn ? fmt.date(new Date(s.publishedOn)) : null,
                        t("adminui.bvc.sourceRows", { n: fmt.number(s.current) }),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-1.5 border-t pt-4 text-sm">
              <p className="font-semibold">{t("adminui.bvc.howTitle")}</p>
              <p className="text-pretty text-muted-foreground">{t("adminui.bvc.howList")}</p>
              <p className="text-pretty text-muted-foreground">{t("adminui.bvc.howNotice")}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default async function AdminBvcPage({ searchParams }: PageProps<"/[locale]/admin/bvc">) {
  const t = await getT();
  return (
    <SuspenseReveal fallback={<AdminListSkeleton label={t("loading.label")} rows={6} />}>
      <Register searchParams={searchParams} />
    </SuspenseReveal>
  );
}
