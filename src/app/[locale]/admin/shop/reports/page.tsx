import type { Route } from "next";
import Link from "next/link";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { requireRole } from "@/features/auth/server";
import { shopReport } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Sales", robots: { index: false } };

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
  const method = (g: string | null) =>
    g === "bkash" || g === "nagad" || g === "cod" ? t(`pay.method.${g}`) : (g ?? "—");

  const stats = [
    { label: t("shopAdmin.revenue"), value: taka(fmt, r.revenue) },
    { label: t("shopAdmin.orderCount"), value: fmt.number(r.orders) },
    {
      label: t("shopAdmin.avgOrder"),
      value: taka(fmt, r.orders ? Math.round(r.revenue / r.orders / 100) * 100 : 0),
    },
    { label: t("shopAdmin.discounts"), value: taka(fmt, r.discount) },
    { label: t("shopAdmin.cancelled"), value: fmt.number(r.cancelled) },
  ];

  return (
    <div className="grid gap-6">
      <PrivateHeading
        title={t("shopAdmin.reports")}
        action={
          <div className="flex gap-1 rounded-full bg-muted/70 p-1">
            {RANGES.map((n) => (
              <Link
                key={n}
                href={`${base}/?days=${n}` as Route}
                aria-current={n === days ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1 text-sm",
                  n === days ? "bg-card shadow-(--shadow-card)" : "text-muted-foreground",
                )}
              >
                {t("shopAdmin.days", { n })}
              </Link>
            ))}
          </div>
        }
      />

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <li key={s.label} className="grid gap-1 rounded-(--radius-xl) bg-card p-4 shadow-(--shadow-card)">
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className="font-heading text-2xl font-semibold tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>

      <section className="grid gap-3 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)">
        <h2 className="font-heading text-lg font-semibold">{t("shopAdmin.daily")}</h2>
        {r.daily.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.empty")}</p>
        ) : (
          <ul className="flex h-40 items-end gap-1" aria-label={t("shopAdmin.daily")}>
            {r.daily.map((d) => (
              <li key={d.day} className="group relative flex h-full flex-1 items-end">
                <span
                  className="w-full rounded-t-md bg-primary/80 transition-colors group-hover:bg-primary"
                  style={{ height: `${Math.max(4, (d.revenue / max) * 100)}%` }}
                />
                <span className="sr-only">
                  {d.day}: {taka(fmt, d.revenue)}, {d.orders}
                </span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background group-hover:block"
                >
                  {d.day} · {taka(fmt, d.revenue)} · {d.orders}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="grid gap-3 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)">
          <h2 className="font-heading text-lg font-semibold">{t("shopAdmin.byMethod")}</h2>
          <ul className="grid gap-2 text-sm">
            {r.byMethod.map((m) => (
              <li key={m.method ?? "none"} className="flex justify-between gap-3">
                <span>{method(m.method)}</span>
                <span className="tabular-nums">
                  {m.orders} · {taka(fmt, m.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="grid gap-3 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)">
          <h2 className="font-heading text-lg font-semibold">{t("shopAdmin.topProducts")}</h2>
          <ol className="grid gap-2 text-sm">
            {r.top.map((p) => (
              <li key={p.name} className="flex justify-between gap-3">
                <span className="truncate">{p.name}</span>
                <span className="tabular-nums">
                  {p.qty} · {taka(fmt, p.revenue)}
                </span>
              </li>
            ))}
          </ol>
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
