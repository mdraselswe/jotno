import type { Route } from "next";
import Link from "next/link";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { adminCounts } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { platformSummary } from "@/features/payments/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Admin", robots: { index: false } };

async function Overview() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.admin));
  const [c, money] = await Promise.all([adminCounts(), platformSummary()]);
  const tiles: { label: string; value: string; href?: Route; alert?: boolean }[] = [
    {
      label: t("admin.pendingVets"),
      value: fmt.number(c.pending),
      href: localeHref(locale, ROUTES.adminVets),
      alert: c.pending > 0,
    },
    {
      label: t("admin.openReports"),
      value: fmt.number(c.openReports),
      href: localeHref(locale, ROUTES.adminReports),
      alert: c.openReports > 0,
    },
    {
      label: t("admin.paidOrders"),
      value: fmt.number(c.paidOrders),
      href: localeHref(locale, ROUTES.adminShop),
      alert: c.paidOrders > 0,
    },
    { label: t("admin.users"), value: fmt.number(c.users) },
    { label: t("admin.verifiedVets"), value: fmt.number(c.verified) },
    { label: t("admin.activeConsults"), value: fmt.number(c.activeConsults) },
    { label: t("admin.consults30"), value: fmt.number(c.consults30) },
    { label: t("admin.refunded30"), value: fmt.number(c.refunded30) },
    { label: t("admin.openQuestions"), value: fmt.number(c.openQuestions) },
    { label: t("admin.charges30"), value: taka(fmt, money.charges30) },
    { label: t("admin.income30"), value: taka(fmt, money.income30) },
    { label: t("admin.owed"), value: taka(fmt, money.owed), href: localeHref(locale, ROUTES.adminPayouts) },
  ];
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("admin.title")} sub={t("admin.sub")} />
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => {
          const body = (
            <>
              <dt className="text-xs text-muted-foreground">{tile.label}</dt>
              <dd className="font-heading text-2xl font-semibold tabular-nums">{tile.value}</dd>
            </>
          );
          const cls = `grid gap-1 rounded-(--radius-xl) border-(length:--border-w) p-(--card-pad) ${tile.alert ? "border-warning/50 bg-warning/10" : "bg-card"}`;
          return tile.href ? (
            <Link key={tile.label} href={tile.href} className={`${cls} hover:bg-muted/40`}>
              {body}
            </Link>
          ) : (
            <div key={tile.label} className={cls}>
              {body}
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Private rows={3}>
      <Overview />
    </Private>
  );
}
