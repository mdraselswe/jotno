import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { auditEntries } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Admin · Audit", robots: { index: false } };

async function Audit() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminAudit));
  const rows = await auditEntries();
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("admin.audit")} />
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">{t("admin.when")}</th>
                <th className="py-2 pr-4 font-medium">{t("admin.who")}</th>
                <th className="py-2 font-medium">{t("admin.what")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="py-2 pr-4 whitespace-nowrap">{fmt.dateTime(r.createdAt)}</td>
                  <td className="py-2 pr-4">{r.actor ?? "system"}</td>
                  <td className="py-2">
                    <span className="font-medium">{r.action}</span>{" "}
                    <span className="text-muted-foreground">
                      {r.entity}
                      {r.entityId ? ` · ${r.entityId}` : ""}
                    </span>
                    {r.meta && Object.keys(r.meta).length > 0 ? (
                      <pre className="mt-1 overflow-x-auto text-xs text-muted-foreground">
                        {JSON.stringify(r.meta)}
                      </pre>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <Private>
      <Audit />
    </Private>
  );
}
