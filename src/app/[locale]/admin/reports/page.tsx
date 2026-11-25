import { ExternalLink, Flag, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
  DataTable,
  EmptyState,
  PageHeader,
  StatusBadge,
  type BadgeTone,
  type Column,
} from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { adminConsultPath, questionPath, ROUTES } from "@/config/routes";
import { AdminListSkeleton, listHref, ReportActions } from "@/features/admin";
import { openReports } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import type { MessageKey } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Admin · Reports", robots: { index: false } };

const ENTITY: Record<string, { label: MessageKey; tone: BadgeTone }> = {
  consult: { label: "adminui.report.consult", tone: "danger" },
  question: { label: "adminui.report.question", tone: "warning" },
  answer: { label: "adminui.report.answer", tone: "warning" },
  review: { label: "adminui.report.review", tone: "info" },
};

async function Reports() {
  const [locale, t, fmt] = await Promise.all([getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminReports));
  const reports = await openReports();

  const target = (entity: string, id: string): Route | null =>
    entity === "consult"
      ? localeHref(locale, adminConsultPath(id))
      : entity === "question"
        ? localeHref(locale, questionPath(id))
        : null;

  type Row = (typeof reports)[number];
  const columns: Column<Row>[] = [
    {
      key: "reason",
      header: t("adminui.report.reason"),
      mobile: "title",
      cell: (r) => <span className="line-clamp-3 text-pretty">{r.reason}</span>,
    },
    {
      key: "what",
      header: t("adminui.report.what"),
      cell: (r) => {
        const e = ENTITY[r.entity];
        const href = target(r.entity, r.entityId);
        return (
          <span className="inline-flex flex-wrap items-center justify-end gap-2 md:justify-start">
            <StatusBadge tone={e?.tone ?? "neutral"}>{e ? t(e.label) : r.entity}</StatusBadge>
            {href ? (
              <Link
                href={href}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {t("common.open")}
                <ExternalLink aria-hidden="true" className="size-3" />
              </Link>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "by",
      header: t("adminui.report.by"),
      className: "max-w-48",
      cell: (r) => <span className="break-all">{r.reporter ?? "—"}</span>,
    },
    {
      key: "when",
      header: t("admin.when"),
      className: "whitespace-nowrap text-muted-foreground",
      cell: (r) => fmt.dateTime(r.createdAt),
    },
    {
      key: "actions",
      header: <span className="sr-only">{t("common.actions")}</span>,
      className: "text-end",
      cell: (r) => <ReportActions id={r.id} entity={r.entity} />,
    },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("admin.reports")}
        sub={t("adminui.report.sub")}
        icon={Flag}
        actions={
          <ButtonLink
            href={listHref(localeHref(locale, ROUTES.adminConsults), { show: "reported" }) as Route}
            variant="outline"
            size="sm"
          >
            {t("adminui.report.consultComplaints")}
          </ButtonLink>
        }
      />
      <DataTable
        rows={reports}
        columns={columns}
        rowKey={(r) => r.id}
        caption={t("admin.reports")}
        empty={
          <EmptyState icon={ShieldCheck} title={t("admin.noReports")} body={t("adminui.report.emptyBody")} />
        }
      />
    </div>
  );
}

export default async function AdminReportsPage() {
  const t = await getT();
  return (
    <SuspenseReveal
      fallback={<AdminListSkeleton label={t("loading.label")} search={false} filters={false} rows={5} />}
    >
      <Reports />
    </SuspenseReveal>
  );
}
