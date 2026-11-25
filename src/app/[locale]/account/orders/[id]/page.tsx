import { Clock, ExternalLink, MapPin, Package, Phone, Receipt, Truck, UserRound, Wallet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/layout/app-ui";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ButtonAnchor, ButtonLink } from "@/components/ui/button-link";
import { orderPath, payPath, productPath, ROUTES } from "@/config/routes";
import { districtName } from "@/content/places";
import { requireViewer } from "@/features/auth/server";
import { WalletMark } from "@/features/payments";
import { getSettings } from "@/features/settings/server";
import {
  CancelMyOrder,
  customerCanCancel,
  OrderStatusBadge,
  OrderTimeline,
  PrintButton,
  ProductThumb,
} from "@/features/shop";
import { myOrder, productThumbs } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
export async function generateMetadata() {
  const t = await getT();
  return { title: t("account.orders"), robots: { index: false } };
}

async function Order({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, orderPath(id)));
  const [o, settings] = await Promise.all([myOrder(id, viewer.id), getSettings()]);
  if (!o) notFound();
  const products = await productThumbs(o.items.flatMap((i) => (i.productId ? [i.productId] : [])));
  const pay = o.payment;
  const needsPay = o.status === "pending_payment" && pay?.status === "pending" && pay.gateway !== "cod";
  const checking = pay?.status === "review";
  const method =
    o.paymentMethod === "bkash" || o.paymentMethod === "nagad" || o.paymentMethod === "cod"
      ? o.paymentMethod
      : null;
  const count = o.items.reduce((n, i) => n + i.qty, 0);

  return (
    <div className="grid max-w-4xl gap-6">
      <PrivateHeading
        title={t("shop.orderNo", { n: o.number })}
        sub={t("shopui.placedOn", { date: fmt.dateTime(o.createdAt) })}
        icon={Package}
        action={<OrderStatusBadge status={o.status} t={t} />}
      />

      {needsPay || checking ? (
        <div
          className={
            checking
              ? "flex flex-wrap items-center gap-3 rounded-(--radius-2xl) bg-info/10 p-4 ring-1 ring-info/20"
              : "flex flex-wrap items-center gap-3 rounded-(--radius-2xl) bg-warning/15 p-4 ring-1 ring-warning/40"
          }
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-card text-primary shadow-(--shadow-control)">
            {checking ? (
              <Clock aria-hidden="true" className="size-5" />
            ) : (
              <Wallet aria-hidden="true" className="size-5" />
            )}
          </span>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="text-sm font-semibold">
              {checking ? t("pay.reviewTitle") : t("shopui.payToConfirm")}
            </p>
            <p className="text-xs text-muted-foreground">
              {checking ? t("shopui.checkingSub") : t("shopui.payToConfirmSub")}
            </p>
          </div>
          {pay ? (
            <ButtonLink
              href={localeHref(locale, payPath(pay.id))}
              variant={checking ? "outline" : "brand"}
              className="max-sm:w-full"
            >
              {checking ? t("common.view") : t("shop.payNow")}
            </ButtonLink>
          ) : null}
        </div>
      ) : null}

      <SectionCard title={t("shopui.tracking")} icon={Truck}>
        <div className="grid gap-5">
          <OrderTimeline
            status={o.status}
            stoppedLabel={
              o.status === "cancelled" || o.status === "returned"
                ? `${t(o.status === "cancelled" ? "shop.status.cancelled" : "shop.status.returned")}${o.cancelReason ? ` · ${o.cancelReason}` : ""}`
                : undefined
            }
            labels={{
              ordered: t("shop.step.ordered"),
              processing: t("shop.step.processing"),
              shipped: t("shop.step.shipped"),
              delivered: t("shop.step.delivered"),
            }}
            dates={{
              ordered: fmt.date(o.createdAt, { day: "numeric", month: "short" }),
              shipped: o.shippedAt ? fmt.date(o.shippedAt, { day: "numeric", month: "short" }) : undefined,
              delivered: o.deliveredAt
                ? fmt.date(o.deliveredAt, { day: "numeric", month: "short" })
                : undefined,
            }}
          />
          {o.courier ? (
            <div className="flex flex-wrap items-center gap-3 rounded-(--radius-xl) bg-muted/60 p-3 text-sm">
              <Truck aria-hidden="true" className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                {t("shop.trackWith", { courier: o.courier, code: o.trackingCode ?? "—" })}
              </span>
              {o.trackingUrl ? (
                <ButtonAnchor
                  href={o.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                  variant="outline"
                >
                  {t("shop.track")}
                  <ExternalLink aria-hidden="true" />
                </ButtonAnchor>
              ) : null}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <SectionCard
          title={t("shopui.items")}
          description={t("shopui.itemsCount", { n: fmt.number(count) })}
          icon={Receipt}
          bodyClassName="p-0 sm:p-0"
        >
          <ul className="divide-y">
            {o.items.map((i) => {
              const p = i.productId ? products.get(i.productId) : undefined;
              // Hidden products keep their photo but have no page to link to.
              const live = p?.active ? p : undefined;
              const thumb = (
                <ProductThumb
                  imageUrl={p?.imageUrl ?? null}
                  category={p?.category ?? ""}
                  className="size-14 shrink-0 rounded-(--radius-lg)"
                />
              );
              return (
                <li key={i.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  {live ? (
                    <Link href={localeHref(locale, productPath(live.slug))} tabIndex={-1}>
                      {thumb}
                    </Link>
                  ) : (
                    thumb
                  )}
                  <div className="grid min-w-0 flex-1 gap-0.5 text-sm">
                    {live ? (
                      <Link
                        href={localeHref(locale, productPath(live.slug))}
                        className="truncate font-medium hover:underline"
                      >
                        {i.name}
                      </Link>
                    ) : (
                      <span className="truncate font-medium">{i.name}</span>
                    )}
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {fmt.number(i.qty)} × {taka(fmt, i.price)}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums">{taka(fmt, i.price * i.qty)}</span>
                </li>
              );
            })}
          </ul>
          <dl className="grid gap-1.5 border-t bg-muted/30 px-4 py-4 text-sm sm:px-5">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("shop.subtotal")}</dt>
              <dd className="tabular-nums">{taka(fmt, o.subtotal)}</dd>
            </div>
            {o.discount > 0 ? (
              <div className="flex justify-between gap-3 text-success">
                <dt>
                  {t("shop.discount")}{" "}
                  {o.couponCode ? <span className="font-mono text-xs">({o.couponCode})</span> : null}
                </dt>
                <dd className="tabular-nums">−{taka(fmt, o.discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("shop.deliveryFee")}</dt>
              <dd className="tabular-nums">
                {o.deliveryFee === 0 ? t("shop.free") : taka(fmt, o.deliveryFee)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t pt-2">
              <dt className="font-semibold">{t("shop.total")}</dt>
              <dd className="font-heading text-xl font-bold tabular-nums">{taka(fmt, o.total)}</dd>
            </div>
          </dl>
        </SectionCard>

        <div className="grid content-start gap-6">
          <SectionCard title={t("shop.deliverTo")} icon={MapPin}>
            <div className="grid gap-2 text-sm">
              <p className="flex gap-2">
                <UserRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">{o.name}</span>
              </p>
              <p className="flex gap-2">
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="text-pretty">
                  {o.address}, {districtName(o.districtId, locale) ?? ""}
                </span>
              </p>
              <p className="flex gap-2">
                <Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="tabular-nums">{o.phone}</span>
              </p>
            </div>
          </SectionCard>
          <SectionCard title={t("shopui.payment")} icon={Wallet}>
            <div className="grid gap-2 text-sm">
              {method ? (
                <WalletMark method={method} label={t(`pay.method.${method}`)} />
              ) : (
                <p className="text-muted-foreground">{t("shopui.notChosen")}</p>
              )}
              {pay ? (
                <p className="text-muted-foreground">
                  {t("shopui.paymentState")}:{" "}
                  <span className="font-medium text-foreground">{t(`pay.status.${pay.status}`)}</span>
                </p>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {customerCanCancel(o.status) ? <CancelMyOrder id={o.id} /> : null}
        <PrintButton label={t("shopAdmin.invoice")} />
        <ButtonLink href={localeHref(locale, ROUTES.orders)} variant="ghost">
          {t("shopui.allOrders")}
        </ButtonLink>
        {settings.supportPhone ? (
          <a
            href={`tel:${settings.supportPhone}`}
            className="flex items-center gap-2 py-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:ms-auto"
          >
            <Phone aria-hidden="true" className="size-4 shrink-0" />
            {t("pay.help", { phone: settings.supportPhone })}
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function OrderPage({ params }: PageProps<"/[locale]/account/orders/[id]">) {
  return (
    <Private rows={4}>
      <Order params={params} />
    </Private>
  );
}
