import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { ROUTES } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { ORDER_STATUS } from "@/features/shop";
import { myOrders } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Orders", robots: { index: false } };

async function Orders() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, ROUTES.orders));
  const orders = await myOrders(viewer.id);
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("account.orders")} />
      {orders.length === 0 ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-muted-foreground">{t("shop.noOrders")}</p>
          <ButtonLink href={localeHref(locale, ROUTES.shop)}>{t("shop.browse")}</ButtonLink>
        </div>
      ) : (
        <ul className="grid gap-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className="grid gap-2 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad)"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{fmt.date(o.createdAt)}</span>
                <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span>
                <Badge variant={o.status === "delivered" ? "default" : "secondary"} className="ml-auto">
                  {t(ORDER_STATUS[o.status] ?? "shop.status.paid")}
                </Badge>
              </div>
              <ul className="grid gap-1 text-sm">
                {o.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3">
                    <span>
                      {i.name} × {i.qty}
                    </span>
                    <span className="tabular-nums">{taka(fmt, i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
              <p className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
                <span>{t("common.total")}</span>
                <span className="tabular-nums">{taka(fmt, o.total)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Private>
      <Orders />
    </Private>
  );
}
