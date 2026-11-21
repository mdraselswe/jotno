import { Plus } from "lucide-react";
import Link from "next/link";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { adminProductPath, ROUTES } from "@/config/routes";
import { districtName } from "@/content/places";
import { requireRole } from "@/features/auth/server";
import { ORDER_STATUS, OrderActions } from "@/features/shop";
import { adminOrders, adminProducts } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Admin · Shop", robots: { index: false } };

async function Shop() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminShop));
  const [orders, products] = await Promise.all([adminOrders(), adminProducts()]);
  return (
    <div className="grid gap-8">
      <PrivateHeading
        title={t("admin.shop")}
        action={
          <ButtonLink href={localeHref(locale, adminProductPath("new"))} size="sm">
            <Plus aria-hidden="true" />
            {t("shop.newProduct")}
          </ButtonLink>
        }
      />
      <section className="grid gap-3">
        <h2 className="font-heading text-xl font-semibold">{t("admin.paidOrders")}</h2>
        {orders.length === 0 ? (
          <p className="text-muted-foreground">{t("admin.empty")}</p>
        ) : (
          <ul className="grid gap-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="grid gap-2 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad)"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">{o.name}</span>
                  <a href={`tel:${o.phone}`} className="text-sm underline">
                    {o.phone}
                  </a>
                  <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span>
                  <Badge className="ml-auto">{t(ORDER_STATUS[o.status] ?? "shop.status.paid")}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {o.address}, {districtName(o.districtId, locale) ?? "—"}
                  {o.note ? ` · ${o.note}` : ""}
                </p>
                <ul className="text-sm">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      {i.name} × {i.qty}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold tabular-nums">{taka(fmt, o.total)}</span>
                  <span className="text-xs text-muted-foreground">{fmt.dateTime(o.createdAt)}</span>
                  <div className="ml-auto">
                    <OrderActions id={o.id} status={o.status} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="grid gap-3">
        <h2 className="font-heading text-xl font-semibold">{t("shop.products")}</h2>
        <ul className="grid gap-2">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                href={localeHref(locale, adminProductPath(p.id))}
                className="flex flex-wrap items-center gap-3 rounded-(--control-radius) border-(length:--border-w) bg-card px-4 py-3 hover:bg-muted/40"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {locale === "bn" ? p.nameBn : p.nameEn}
                </span>
                <span className="text-sm tabular-nums">{taka(fmt, p.price)}</span>
                <span
                  className={`text-sm tabular-nums ${p.stock <= 0 ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {t("shop.stock")}: {p.stock}
                </span>
                {!p.active ? <Badge variant="secondary">{t("shop.hidden")}</Badge> : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function AdminShopPage() {
  return (
    <Private>
      <Shop />
    </Private>
  );
}
