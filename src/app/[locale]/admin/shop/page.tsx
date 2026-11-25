import {
  AlertTriangle,
  Clock,
  Download,
  PackageCheck,
  PhoneCall,
  Search,
  ShoppingBag,
  Truck,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { ButtonAnchor, ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { adminOrderPath, adminProductPath, ROUTES } from "@/config/routes";
import { districtName } from "@/content/places";
import { requireRole } from "@/features/auth/server";
import { WalletMark } from "@/features/payments";
import { ORDER_STATUS, ORDER_STATUSES, OrderStatusBadge, type OrderStatus } from "@/features/shop";
import { ADMIN_ORDERS_PAGE, adminOrders, lowStockProducts, orderCounts } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

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
  type Row = (typeof items)[number];
  const columns: Column<Row>[] = [
    {
      key: "number",
      header: t("shopAdmin.order"),
      mobile: "title",
      cell: (o) => (
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-heading font-bold">#{o.number}</span>
          <span className="md:hidden">
            <OrderStatusBadge status={o.status} t={t} />
          </span>
        </span>
      ),
    },
    {
      key: "customer",
      header: t("shopAdmin.customer"),
      cell: (o) => (
        <span className="grid min-w-0 md:max-w-56">
          <span className="truncate font-medium">{o.name}</span>
          <span className="truncate text-xs text-muted-foreground tabular-nums">
            {o.phone} · {districtName(o.districtId, locale) ?? ""}
          </span>
        </span>
      ),
    },
    {
      key: "items",
      header: t("shopAdmin.items"),
      mobile: "hide",
      cell: (o) => (
        <span className="line-clamp-2 max-w-64 text-xs text-muted-foreground">
          {o.items.map((i) => `${i.name} × ${fmt.number(i.qty)}`).join(", ")}
        </span>
      ),
    },
    {
      key: "total",
      header: t("shopAdmin.total"),
      className: "text-end",
      cell: (o) => <span className="font-semibold tabular-nums">{taka(fmt, o.total)}</span>,
    },
    {
      key: "method",
      header: t("admin.method"),
      cell: (o) =>
        o.paymentMethod === "bkash" || o.paymentMethod === "nagad" || o.paymentMethod === "cod" ? (
          <WalletMark method={o.paymentMethod} label={t(`pay.method.${o.paymentMethod}`)} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: t("shopui.admin.status"),
      mobile: "hide",
      cell: (o) => <OrderStatusBadge status={o.status} t={t} />,
    },
    {
      key: "when",
      header: t("admin.when"),
      cell: (o) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">{fmt.dateTime(o.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="grid gap-6">
      <PrivateHeading
        title={t("shopAdmin.orders")}
        sub={t("shopui.admin.ordersSub")}
        icon={ShoppingBag}
        action={
          <ButtonAnchor href="/api/admin/orders-csv" variant="outline" size="sm" download>
            <Download aria-hidden="true" />
            {t("shopAdmin.export")}
          </ButtonAnchor>
        }
      />

      <StatGrid className="xl:grid-cols-4">
        <StatCard
          label={t("shopui.admin.toCall")}
          value={fmt.number(counts.placed)}
          hint={t("shopui.admin.toCallHint")}
          icon={PhoneCall}
          tone={counts.placed > 0 ? "warning" : "default"}
          href={href({ status: "placed" })}
        />
        <StatCard
          label={t("shopui.admin.toPack")}
          value={fmt.number(counts.paid + counts.processing)}
          hint={t("shopui.admin.toPackHint")}
          icon={PackageCheck}
          tone={counts.paid > 0 ? "primary" : "default"}
          href={href({ status: "paid" })}
        />
        <StatCard
          label={t(ORDER_STATUS.shipped)}
          value={fmt.number(counts.shipped)}
          icon={Truck}
          href={href({ status: "shipped" })}
        />
        <StatCard
          label={t(ORDER_STATUS.pending_payment)}
          value={fmt.number(counts.pending_payment)}
          hint={t("shopui.admin.unpaidHint")}
          icon={Clock}
          href={href({ status: "pending_payment" })}
        />
      </StatGrid>

      {low.length > 0 ? (
        <SectionCard
          title={t("shopAdmin.lowStock")}
          description={t("shopui.admin.lowSub", { n: fmt.number(low.length) })}
          icon={AlertTriangle}
          className="ring-warning/40"
          actions={
            <ButtonLink href={localeHref(locale, ROUTES.adminProducts)} variant="ghost" size="sm">
              {t("shopui.seeAll")}
            </ButtonLink>
          }
        >
          <ul className="flex flex-wrap gap-2">
            {low.slice(0, 8).map((p) => (
              <li key={p.id}>
                <Link
                  href={localeHref(locale, adminProductPath(p.id))}
                  className="inline-flex h-8 items-center gap-2 rounded-full bg-muted px-3 text-sm transition-colors duration-(--motion-fast) hover:bg-foreground/10"
                >
                  <span className="max-w-48 truncate">{locale === "bn" ? p.nameBn : p.nameEn}</span>
                  <span
                    className={
                      p.stock <= 0
                        ? "rounded-full bg-destructive/15 px-1.5 text-xs font-bold text-destructive tabular-nums"
                        : "rounded-full bg-warning/30 px-1.5 text-xs font-bold tabular-nums"
                    }
                  >
                    {fmt.number(p.stock)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <div className="grid gap-3">
        <FilterPills
          label={t("shopui.admin.byStatus")}
          items={tabs.map((tab) => ({
            href: href({ status: tab.key, page: 1 }),
            label: tab.label,
            active: status === tab.key,
            count: tab.n ? tab.n : undefined,
          }))}
        />
        <form action={base} className="flex max-w-md gap-2" role="search">
          {status !== "open" ? <input type="hidden" name="status" value={status} /> : null}
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              name="q"
              type="search"
              defaultValue={q}
              placeholder={t("shopAdmin.search")}
              aria-label={t("shopAdmin.search")}
              className="ps-9"
            />
          </div>
          <Button type="submit" variant="outline">
            {t("shop.f.go")}
          </Button>
        </form>
      </div>

      <DataTable
        rows={items}
        columns={columns}
        rowKey={(o) => o.id}
        rowHref={(o) => localeHref(locale, adminOrderPath(o.id))}
        caption={t("shopAdmin.orders")}
        empty={
          <EmptyState
            icon={ShoppingBag}
            title={t("shopAdmin.noOrders")}
            body={q ? t("shopui.admin.noOrdersSearch") : t("shopui.admin.noOrdersSub")}
            action={
              q || status !== "open" ? (
                <ButtonLink href={`${base}/` as Route} variant="outline">
                  {t("shop.f.clear")}
                </ButtonLink>
              ) : null
            }
          />
        }
      />

      {pages > 1 ? (
        <nav className="flex items-center justify-center gap-3 text-sm" aria-label={t("shop.f.pages")}>
          {page > 1 ? (
            <ButtonLink href={href({ page: page - 1 })} variant="outline" size="sm">
              {t("shop.f.prev")}
            </ButtonLink>
          ) : null}
          <span className="text-muted-foreground tabular-nums">
            {t("shop.f.page", { n: fmt.number(page), total: fmt.number(pages) })}
          </span>
          {page < pages ? (
            <ButtonLink href={href({ page: page + 1 })} variant="outline" size="sm">
              {t("shop.f.next")}
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
