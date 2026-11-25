import { ChevronRight, Package, ShoppingBag, Wallet } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/layout/app-ui";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ButtonLink } from "@/components/ui/button-link";
import { orderPath, ROUTES } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { OrderStatusBadge, ProductThumb } from "@/features/shop";
import { myOrders, productsByIds } from "@/features/shop/server";
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
  // Photos for the first items of each order (products still in the shop).
  const firstIds = [
    ...new Set(orders.flatMap((o) => o.items.slice(0, 3).flatMap((i) => (i.productId ? [i.productId] : [])))),
  ];
  const products = await productsByIds(firstIds, locale);
  const photo = (id: string | null) => (id ? products.find((p) => p.id === id) : undefined);

  return (
    <div className="grid gap-6">
      <PrivateHeading
        title={t("account.orders")}
        sub={t("shopui.ordersSub")}
        icon={Package}
        action={
          orders.length > 0 ? (
            <ButtonLink href={localeHref(locale, ROUTES.shop)} variant="outline" size="sm">
              <ShoppingBag aria-hidden="true" />
              {t("shop.browse")}
            </ButtonLink>
          ) : null
        }
      />
      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t("shop.noOrders")}
          body={t("shopui.noOrdersSub")}
          action={
            <ButtonLink href={localeHref(locale, ROUTES.shop)} variant="brand">
              <ShoppingBag aria-hidden="true" />
              {t("shop.browse")}
            </ButtonLink>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {orders.map((o) => {
            const count = o.items.reduce((n, i) => n + i.qty, 0);
            const first = o.items[0];
            const more = o.items.length - 1;
            const toPay = o.status === "pending_payment";
            return (
              <li key={o.id}>
                <Link
                  href={localeHref(locale, orderPath(o.id))}
                  className="group grid gap-3 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 transition-[box-shadow,translate] duration-(--motion-base) ease-(--ease-ui) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:hover:translate-y-0 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-heading text-base font-bold">
                      {t("shop.orderNo", { n: o.number })}
                    </span>
                    <OrderStatusBadge status={o.status} t={t} />
                    <span className="ms-auto text-xs text-muted-foreground">{fmt.date(o.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex shrink-0 -space-x-3">
                      {o.items.slice(0, 3).map((i) => {
                        const p = photo(i.productId);
                        return (
                          <ProductThumb
                            key={i.id}
                            imageUrl={p?.imageUrl ?? null}
                            category={p?.category ?? ""}
                            className="size-12 rounded-(--radius-lg) ring-2 ring-card"
                          />
                        );
                      })}
                    </span>
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="truncate text-sm font-medium">
                        {first?.name}
                        {more > 0 ? (
                          <span className="text-muted-foreground">
                            {" "}
                            {t("shopui.andMore", { n: fmt.number(more) })}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t("shopui.itemsCount", { n: fmt.number(count) })}
                      </span>
                    </span>
                    <span className="grid justify-items-end gap-0.5">
                      <span className="font-heading font-bold tabular-nums">{taka(fmt, o.total)}</span>
                      {toPay ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                          <Wallet aria-hidden="true" className="size-3.5" />
                          {t("shop.payNow")}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-5 shrink-0 text-muted-foreground transition-transform duration-(--motion-fast) group-hover:translate-x-0.5"
                    />
                  </div>
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
