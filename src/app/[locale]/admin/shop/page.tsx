import { AlertTriangle, Download, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ButtonAnchor, ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { adminOrderPath, adminProductPath, ROUTES } from "@/config/routes";
import { districtName } from "@/content/places";
import { requireRole } from "@/features/auth/server";
import { ORDER_STATUS, ORDER_STATUSES, type OrderStatus } from "@/features/shop";
import { ADMIN_ORDERS_PAGE, adminOrders, lowStockProducts, orderCounts } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Orders", robots: { index: false } };

type Filter = OrderStatus | "open" | "all";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Orders({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminShop));
  const raw = one(sp.status);
  const status: Filter =
    raw === "all" || (ORDER_STATUSES as readonly string[]).includes(raw ?? "") ? (raw as Filter) : "open";
  const q = one(sp.q)?.slice(0, 40) ?? "";
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const [{ items, total }, counts, low] = await Promise.all([
    adminOrders({ status, q, page }),
    orderCounts(),
    lowStockProducts(),
  ]);
  const base = localeHref(locale, ROUTES.adminShop);
  const href = (patch: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    const next = { status, q, page: 1, ...patch };
    if (next.status && next.status !== "open") p.set("status", String(next.status));
    if (next.q) p.set("q", String(next.q));
    if (next.page && Number(next.page) > 1) p.set("page", String(next.page));
    const s = p.toString();
    return (s ? `${base}/?${s}` : `${base}/`) as Route;
  };
  const open = counts.placed + counts.paid + counts.processing + counts.shipped;
  const tabs: { key: Filter; label: string; n?: number }[] = [
    { key: "open", label: t("shopAdmin.open"), n: open },
    { key: "pending_payment", label: t(ORDER_STATUS.pending_payment), n: counts.pending_payment },
    { key: "placed", label: t(ORDER_STATUS.placed), n: counts.placed },
    { key: "paid", label: t(ORDER_STATUS.paid), n: counts.paid },
    { key: "processing", label: t(ORDER_STATUS.processing), n: counts.processing },
    { key: "shipped", label: t(ORDER_STATUS.shipped), n: counts.shipped },
    { key: "delivered", label: t(ORDER_STATUS.delivered) },
    { key: "cancelled", label: t(ORDER_STATUS.cancelled) },
    { key: "returned", label: t(ORDER_STATUS.returned) },
    { key: "all", label: t("shopAdmin.all") },
  ];
  const pages = Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE));

  return (
    <div className="grid gap-6">
      <PrivateHeading
        title={t("shopAdmin.orders")}
        action={
          <ButtonAnchor href="/api/admin/orders-csv" variant="outline" size="sm" download>
            <Download aria-hidden="true" />
            {t("shopAdmin.export")}
          </ButtonAnchor>
        }
      />

      {low.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-(--radius-xl) bg-warning/15 p-3 text-sm">
          <AlertTriangle aria-hidden="true" className="size-4 text-warning" />
          <strong>{t("shopAdmin.lowStock")}:</strong>
          {low.slice(0, 6).map((p) => (
            <Link
              key={p.id}
              href={localeHref(locale, adminProductPath(p.id))}
              className="rounded-full bg-card px-2.5 py-0.5 hover:underline"
            >
              {locale === "bn" ? p.nameBn : p.nameEn} · {p.stock}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3">
        <div className="-mx-1 overflow-x-auto">
          <ul className="flex w-max gap-1.5 px-1">
            {tabs.map((tab) => (
              <li key={tab.key}>
                <Link
                  href={href({ status: tab.key, page: 1 })}
                  aria-current={status === tab.key ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                    status === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground shadow-(--shadow-card) hover:text-foreground",
                  )}
                >
                  {tab.label}
                  {tab.n ? (
                    <span className="rounded-full bg-background/30 px-1.5 text-xs tabular-nums">{tab.n}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <form action={base} className="relative max-w-md" role="search">
          {status !== "open" ? <input type="hidden" name="status" value={status} /> : null}
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            name="q"
            defaultValue={q}
            placeholder={t("shopAdmin.search")}
            aria-label={t("shopAdmin.search")}
            className="pl-9"
          />
        </form>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">{t("shopAdmin.noOrders")}</p>
      ) : (
        <ul className="grid gap-3">
          {items.map((o) => (
            <li key={o.id}>
              <Link
                href={localeHref(locale, adminOrderPath(o.id))}
                className="grid gap-2 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card) transition-transform duration-(--motion-fast)"
              >
                <span className="flex flex-wrap items-center gap-3">
                  <span className="font-heading font-semibold">#{o.number}</span>
                  <span className="font-medium">{o.name}</span>
                  <span className="text-sm text-muted-foreground">{o.phone}</span>
                  <Badge variant={o.status === "placed" ? "default" : "secondary"} className="ml-auto">
                    {t(ORDER_STATUS[o.status])}
                  </Badge>
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}
                </span>
                <span className="flex flex-wrap items-center gap-3 text-sm">
                  <strong className="tabular-nums">{taka(fmt, o.total)}</strong>
                  {o.paymentMethod ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {o.paymentMethod === "bkash" || o.paymentMethod === "nagad" || o.paymentMethod === "cod"
                        ? t(`pay.method.${o.paymentMethod}`)
                        : o.paymentMethod}
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {districtName(o.districtId, locale) ?? ""}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">{fmt.dateTime(o.createdAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav className="flex items-center justify-center gap-3 text-sm" aria-label="Pages">
          {page > 1 ? (
            <ButtonLink href={href({ page: page - 1 })} variant="outline" size="sm">
              {t("common.back")}
            </ButtonLink>
          ) : null}
          <span className="tabular-nums">
            {page} / {pages}
          </span>
          {page < pages ? (
            <ButtonLink href={href({ page: page + 1 })} variant="outline" size="sm">
              {t("common.next")}
            </ButtonLink>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

export default function AdminOrdersPage({ searchParams }: PageProps<"/[locale]/admin/shop">) {
  return (
    <Private rows={5}>
      <Orders searchParams={searchParams} />
    </Private>
  );
}
