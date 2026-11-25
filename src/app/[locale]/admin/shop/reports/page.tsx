import {
  Ban,
  Banknote,
  ChartColumn,
  Receipt,
  ShoppingBag,
  TicketPercent,
  Trophy,
  Wallet,
} from "lucide-react";
import type { Route } from "next";
import {
  DataTable,
  EmptyState,
  FilterPills,
  SectionCard,
  StatCard,
  StatGrid,
  type Column,
} from "@/components/layout/app-ui";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { requireRole } from "@/features/auth/server";
import { WalletMark } from "@/features/payments";
import { shopReport } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { adminMetadata } from "@/features/admin/server";

export async function generateMetadata() {
  return adminMetadata("shopAdmin.reports");
}

const RANGES = [7, 30, 90] as const;

async function Reports({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminShopReports));
  const asked = Number(Array.isArray(sp.days) ? sp.days[0] : sp.days);
  const days = (RANGES as readonly number[]).includes(asked) ? asked : 30;
  const r = await shopReport(days);
  const max = Math.max(1, ...r.daily.map((d) => d.revenue));
  const base = localeHref(locale, ROUTES.adminShopReports);
  const dayLabel = (day: string) =>
    fmt.date(new Date(`${day}T12:00:00+06:00`), { day: "numeric", month: "short" });
  type Top = (typeof r.top)[number];
  const topCols: Column<Top>[] = [
    {
      key: "name",
      header: t("shopui.admin.product"),
      mobile: "title",
      cell: (p) => <span className="line-clamp-2">{p.name}</span>,
    },
    {
      key: "qty",
      header: t("shopAdmin.qty"),
      className: "text-end",
      cell: (p) => <span className="tabular-nums">{fmt.number(p.qty)}</span>,
    },
    {
      key: "revenue",
      header: t("shopAdmin.revenue"),
      className: "text-end",
      cell: (p) => <span className="font-semibold tabular-nums">{taka(fmt, p.revenue)}</span>,
    },
  ];

  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("shopAdmin.reports")} sub={t("shopui.admin.reportsSub")} icon={ChartColumn} />
      <FilterPills
        label={t("shopui.admin.range")}
        items={RANGES.map((n) => ({
          href: `${base}/?days=${n}` as Route,
          label: t("shopAdmin.days", { n: fmt.number(n) }),
          active: n === days,
        }))}
      />

      <StatGrid className="xl:grid-cols-5">
        <StatCard label={t("shopAdmin.revenue")} value={taka(fmt, r.revenue)} icon={Wallet} tone="primary" />
        <StatCard label={t("shopAdmin.orderCount")} value={fmt.number(r.orders)} icon={ShoppingBag} />
        <StatCard
          label={t("shopAdmin.avgOrder")}
          value={taka(fmt, r.orders ? Math.round(r.revenue / r.orders / 100) * 100 : 0)}
          icon={Receipt}
        />
        <StatCard label={t("shopAdmin.discounts")} value={taka(fmt, r.discount)} icon={TicketPercent} />
        <StatCard
          label={t("shopAdmin.cancelled")}
          value={fmt.number(r.cancelled)}
          icon={Ban}
          tone={r.cancelled > 0 ? "danger" : "default"}
        />
      </StatGrid>

      <SectionCard title={t("shopAdmin.daily")} icon={ChartColumn}>
        {r.daily.length === 0 ? (
          <EmptyState
            icon={ChartColumn}
            title={t("shopui.admin.noSales")}
            body={t("shopui.admin.noSalesSub")}
            className="border-0 py-8"
          />
        ) : (
          <div className="grid gap-2">
            <ul className="flex h-44 items-end gap-0.5 sm:gap-1" aria-label={t("shopAdmin.daily")}>
              {r.daily.map((d) => (
                <li key={d.day} className="group relative flex h-full min-w-0 flex-1 items-end">
                  <span
                    className="w-full origin-bottom rounded-t-(--radius-sm) bg-primary/75 transition-colors duration-(--motion-fast) group-hover:bg-primary"
                    style={{ height: `${Math.max(3, (d.revenue / max) * 100)}%` }}
                  />
                  <span className="sr-only">
                    {dayLabel(d.day)}: {taka(fmt, d.revenue)},{" "}
                    {t("shopui.admin.ordersN", { n: fmt.number(d.orders) })}
                  </span>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-(--radius-md) bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background shadow-(--shadow-overlay) group-hover:block"
                  >
                    {dayLabel(d.day)} · {taka(fmt, d.revenue)} ·{" "}
                    {t("shopui.admin.ordersN", { n: fmt.number(d.orders) })}
                  </span>
                </li>
              ))}
            </ul>
            <div aria-hidden="true" className="flex justify-between text-xs text-muted-foreground">
              <span>{r.daily[0] ? dayLabel(r.daily[0].day) : ""}</span>
              <span>{r.daily.at(-1) ? dayLabel(r.daily.at(-1)?.day ?? "") : ""}</span>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={t("shopAdmin.byMethod")} icon={Banknote}>
          {r.byMethod.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("shopui.admin.noSales")}</p>
          ) : (
            <ul className="grid gap-3 text-sm">
              {r.byMethod.map((m) => {
                const share = r.revenue > 0 ? (m.revenue ?? 0) / r.revenue : 0;
                return (
                  <li key={m.method ?? "none"} className="grid gap-1.5">
                    <span className="flex items-center justify-between gap-3">
                      {m.method === "bkash" || m.method === "nagad" || m.method === "cod" ? (
                        <WalletMark method={m.method} label={t(`pay.method.${m.method}`)} />
                      ) : (
                        <span className="text-muted-foreground">{m.method ?? "—"}</span>
                      )}
                      <span className="tabular-nums">
                        {t("shopui.admin.ordersN", { n: fmt.number(m.orders) })} ·{" "}
                        <strong>{taka(fmt, m.revenue ?? 0)}</strong>
                      </span>
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <span
                        className="block h-full origin-left rounded-full bg-primary"
                        style={{ transform: `scaleX(${share})` }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
        <section className="grid content-start gap-3" aria-labelledby="top-products">
          <h2 id="top-products" className="flex items-center gap-2.5 font-heading text-base font-semibold">
            <Trophy aria-hidden="true" className="size-4.5 text-primary" />
            {t("shopAdmin.topProducts")}
          </h2>
          <DataTable
            rows={r.top}
            columns={topCols}
            rowKey={(p) => p.name}
            caption={t("shopAdmin.topProducts")}
            empty={
              <p className="rounded-(--radius-2xl) bg-card p-5 text-sm text-muted-foreground shadow-(--shadow-card) ring-1 ring-foreground/6">
                {t("shopui.admin.noSales")}
              </p>
            }
          />
        </section>
      </div>
    </div>
  );
}

export default function AdminShopReportsPage({ searchParams }: PageProps<"/[locale]/admin/shop/reports">) {
  return (
    <Private rows={4}>
      <Reports searchParams={searchParams} />
    </Private>
  );
}
