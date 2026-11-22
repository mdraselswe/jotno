import Link from "next/link";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { adminVetPath, ROUTES } from "@/config/routes";
import { providersByStatus } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Admin · Vets", robots: { index: false } };

async function Vets() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminVets));
  const [pending, all] = await Promise.all([providersByStatus("pending"), providersByStatus("all")]);
  const row = (v: (typeof all)[number]) => (
    <li key={v.id}>
      <Link
        href={localeHref(locale, adminVetPath(v.id))}
        className="flex flex-wrap items-center gap-3 rounded-(--control-radius) bg-card px-4 py-3 shadow-(--shadow-card) hover:bg-muted/40"
      >
        <span className="grid min-w-0 flex-1">
          <span className="font-medium">
            {v.displayName} {v.isDemo ? <span className="text-xs text-muted-foreground">(demo)</span> : null}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {v.email} · {v.district ?? "—"} · BVC {v.registrationNo ?? "—"} · {v.completeness}%
          </span>
        </span>
        {v.submittedAt ? (
          <span className="text-xs text-muted-foreground">{fmt.date(v.submittedAt)}</span>
        ) : null}
        <Badge variant={v.status === "verified" ? "default" : "secondary"}>{v.status}</Badge>
      </Link>
    </li>
  );
  return (
    <div className="grid gap-8">
      <PrivateHeading title={t("admin.queue")} sub={t("admin.checklist")} />
      {pending.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.empty")}</p>
      ) : (
        <ul className="grid gap-2">{pending.map(row)}</ul>
      )}
      <section className="grid gap-3">
        <h2 className="font-heading text-xl font-semibold">{t("admin.all")}</h2>
        <ul className="grid gap-2">{all.map(row)}</ul>
      </section>
    </div>
  );
}

export default function AdminVetsPage() {
  return (
    <Private>
      <Vets />
    </Private>
  );
}
