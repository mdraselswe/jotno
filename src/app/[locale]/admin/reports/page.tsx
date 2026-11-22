import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/routes";
import { ReportActions } from "@/features/admin";
import { openReports } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Admin · Reports", robots: { index: false } };

async function Reports() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminReports));
  const reports = await openReports();
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("admin.reports")} />
      {reports.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.noReports")}</p>
      ) : (
        <ul className="grid gap-2">
          {reports.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-(--control-radius) bg-card px-4 py-3 shadow-(--shadow-card)"
            >
              <Badge variant="secondary">{r.entity}</Badge>
              <span className="grid min-w-0 flex-1">
                <span>{r.reason}</span>
                <span className="text-xs text-muted-foreground">
                  {fmt.dateTime(r.createdAt)} · {r.reporter ?? "—"} ·{" "}
                  <span className="font-mono">{r.entityId}</span>
                </span>
              </span>
              <ReportActions id={r.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <Private>
      <Reports />
    </Private>
  );
}
