import { ChevronRight, Package } from "lucide-react";
import Link from "next/link";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { orderPath, ROUTES } from "@/config/routes";
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
          {orders.map((o) => {
            const count = o.items.reduce((n, i) => n + i.qty, 0);
            return (
              <li key={o.id}>
                <Link
                  href={localeHref(locale, orderPath(o.id))}
                  className="group flex items-center gap-4 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card) transition-transform duration-(--motion-fast) ease-(--ease-out)"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-highlight/25 text-primary">
                    <Package aria-hidden="true" className="size-5" />
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-heading font-semibold">{t("shop.orderNo", { n: o.number })}</span>
                      <Badge variant={o.status === "delivered" ? "default" : "secondary"}>
                        {t(ORDER_STATUS[o.status])}
                      </Badge>
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {fmt.date(o.createdAt)} · {o.items.map((i) => i.name).join(", ")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("shopAdmin.items")}: {count}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{taka(fmt, o.total)}</span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            );
          })}
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
