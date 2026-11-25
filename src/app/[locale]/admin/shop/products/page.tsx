import { AlertTriangle, EyeOff, Package, PackageX, Plus, Search } from "lucide-react";
import type { Route } from "next";
import {
  DataTable,
  EmptyState,
  FilterPills,
  StatCard,
  StatGrid,
  StatusBadge,
  type Column,
} from "@/components/layout/app-ui";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { adminProductPath, ROUTES } from "@/config/routes";
import { requireRole } from "@/features/auth/server";
import { categoryLabel, ProductThumb } from "@/features/shop";
import { adminProducts, shopCategories } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { adminMetadata } from "@/features/admin/server";

export async function generateMetadata() {
  return adminMetadata("shopAdmin.products");
}

const VIEWS = ["all", "live", "low", "out", "hidden"] as const;
type View = (typeof VIEWS)[number];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Products({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminProducts));
  const [products, categories] = await Promise.all([adminProducts(), shopCategories(true)]);
  const raw = one(sp.view);
  const view: View = (VIEWS as readonly string[]).includes(raw ?? "") ? (raw as View) : "all";
  const q = (one(sp.q) ?? "").trim().toLowerCase().slice(0, 40);
  const isOut = (p: (typeof products)[number]) => p.stock <= 0;
  const isLow = (p: (typeof products)[number]) => p.stock > 0 && p.stock <= p.lowStockAt;
  const counts: Record<View, number> = {
    all: products.length,
    live: products.filter((p) => p.active).length,
    low: products.filter((p) => p.active && isLow(p)).length,
    out: products.filter((p) => p.active && isOut(p)).length,
    hidden: products.filter((p) => !p.active).length,
  };
  const rows = products.filter((p) => {
    if (view === "live" && !p.active) return false;
    if (view === "low" && !(p.active && isLow(p))) return false;
    if (view === "out" && !(p.active && isOut(p))) return false;
    if (view === "hidden" && p.active) return false;
    if (q && ![p.nameEn, p.nameBn, p.sku ?? ""].some((s) => s.toLowerCase().includes(q))) return false;
    return true;
  });
  const base = localeHref(locale, ROUTES.adminProducts);
  const href = (v: View) => {
    const p = new URLSearchParams();
    if (v !== "all") p.set("view", v);
    if (q) p.set("q", q);
    const s = p.toString();
    return (s ? `${base}/?${s}` : `${base}/`) as Route;
  };
  const labels: Record<View, string> = {
    all: t("shopAdmin.all"),
    live: t("shopui.admin.live"),
    low: t("shopAdmin.lowStock"),
    out: t("shopAdmin.outOfStock"),
    hidden: t("shop.hidden"),
  };
  type Row = (typeof products)[number];
  const columns: Column<Row>[] = [
    {
      key: "name",
      header: t("shopui.admin.product"),
      mobile: "title",
      cell: (p) => (
        <span className="flex min-w-0 items-center gap-3">
          <ProductThumb
            imageUrl={p.imageUrl}
            category={p.category}
            className="size-11 shrink-0 rounded-(--radius-md)"
          />
          <span className="grid min-w-0">
            <span className="truncate font-medium">{locale === "bn" ? p.nameBn : p.nameEn}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {[p.sku, p.unit].filter(Boolean).join(" · ") || "—"}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "category",
      header: t("shop.category"),
      cell: (p) => <span className="text-sm">{categoryLabel(categories, p.category, locale)}</span>,
    },
    {
      key: "price",
      header: t("shop.price"),
      className: "text-end",
      cell: (p) => (
        <span className="grid justify-items-end">
          <span className="font-semibold tabular-nums">{taka(fmt, p.price)}</span>
          {p.compareAt && p.compareAt > p.price ? (
            <span className="text-xs text-muted-foreground tabular-nums line-through">
              {taka(fmt, p.compareAt)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "stock",
      header: t("shopAdmin.stock"),
      cell: (p) =>
        isOut(p) ? (
          <StatusBadge tone="danger">{t("shopAdmin.outOfStock")}</StatusBadge>
        ) : isLow(p) ? (
          <StatusBadge tone="warning">{fmt.number(p.stock)}</StatusBadge>
        ) : (
          <span className="font-medium tabular-nums">{fmt.number(p.stock)}</span>
        ),
    },
    {
      key: "status",
      header: t("shopui.admin.status"),
      cell: (p) =>
        p.active ? (
          <StatusBadge tone="success">{t("shopui.admin.live")}</StatusBadge>
        ) : (
          <StatusBadge>{t("shop.hidden")}</StatusBadge>
        ),
    },
  ];

  return (
    <div className="grid gap-6">
      <PrivateHeading
        title={t("shopAdmin.products")}
        sub={t("shopui.admin.productsSub")}
        icon={Package}
        action={
          <ButtonLink href={localeHref(locale, adminProductPath("new"))} variant="brand">
            <Plus aria-hidden="true" />
            {t("shop.newProduct")}
          </ButtonLink>
        }
      />

      <StatGrid className="xl:grid-cols-4">
        <StatCard
          label={t("shopui.admin.live")}
          value={fmt.number(counts.live)}
          icon={Package}
          href={href("live")}
        />
        <StatCard
          label={t("shopAdmin.lowStock")}
          value={fmt.number(counts.low)}
          icon={AlertTriangle}
          tone={counts.low > 0 ? "warning" : "default"}
          href={href("low")}
        />
        <StatCard
          label={t("shopAdmin.outOfStock")}
          value={fmt.number(counts.out)}
          icon={PackageX}
          tone={counts.out > 0 ? "danger" : "default"}
          href={href("out")}
        />
        <StatCard
          label={t("shop.hidden")}
          value={fmt.number(counts.hidden)}
          icon={EyeOff}
          href={href("hidden")}
        />
      </StatGrid>

      <div className="grid gap-3">
        <FilterPills
          label={t("shopui.admin.byStatus")}
          items={VIEWS.map((v) => ({
            href: href(v),
            label: labels[v],
            active: view === v,
            count: fmt.number(counts[v]),
          }))}
        />
        <form action={base} role="search" className="relative max-w-md">
          {view !== "all" ? <input type="hidden" name="view" value={view} /> : null}
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t("shopui.admin.searchProducts")}
            aria-label={t("shopui.admin.searchProducts")}
            className="ps-9"
          />
        </form>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(p) => p.id}
        rowHref={(p) => localeHref(locale, adminProductPath(p.id))}
        caption={t("shopAdmin.products")}
        empty={
          <EmptyState
            icon={Package}
            title={products.length === 0 ? t("shopui.admin.noProducts") : t("shop.f.noMatch")}
            body={products.length === 0 ? t("shopui.admin.noProductsSub") : undefined}
            action={
              products.length === 0 ? (
                <ButtonLink href={localeHref(locale, adminProductPath("new"))} variant="brand">
                  <Plus aria-hidden="true" />
                  {t("shop.newProduct")}
                </ButtonLink>
              ) : (
                <ButtonLink href={`${base}/` as Route} variant="outline">
                  {t("shop.f.clear")}
                </ButtonLink>
              )
            }
          />
        }
      />
    </div>
  );
}

export default function AdminProductsPage({ searchParams }: PageProps<"/[locale]/admin/shop/products">) {
  return (
    <Private rows={6}>
      <Products searchParams={searchParams} />
    </Private>
  );
}
