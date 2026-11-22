import { ExternalLink, MapPin, Phone, Truck, Wallet } from "lucide-react";
import { notFound } from "next/navigation";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { orderPath, payPath, ROUTES } from "@/config/routes";
import { districtName } from "@/content/places";
import { requireViewer } from "@/features/auth/server";
import { getSettings } from "@/features/settings/server";
import { CancelMyOrder, customerCanCancel, ORDER_STATUS, OrderTimeline, PrintButton } from "@/features/shop";
import { myOrder } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Order", robots: { index: false } };

async function Order({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, orderPath(id)));
  const [o, settings] = await Promise.all([myOrder(id, viewer.id), getSettings()]);
  if (!o) notFound();
  const pay = o.payment;
  const needsPay = o.status === "pending_payment" && pay?.status === "pending" && pay.gateway !== "cod";
  const checking = pay?.status === "review";
  const stopped = o.status === "cancelled" || o.status === "returned";
  const method =
    o.paymentMethod === "bkash" || o.paymentMethod === "nagad" || o.paymentMethod === "cod"
      ? t(`pay.method.${o.paymentMethod}`)
      : null;

  return (
    <div className="grid max-w-3xl gap-6">
      <PrivateHeading
        title={t("shop.orderNo", { n: o.number })}
        sub={fmt.dateTime(o.createdAt)}
        action={<Badge variant={stopped ? "destructive" : "secondary"}>{t(ORDER_STATUS[o.status])}</Badge>}
      />

      {needsPay || checking ? (
        <div className="flex flex-wrap items-center gap-3 rounded-(--radius-xl) bg-highlight/20 p-4">
          <Wallet aria-hidden="true" className="size-5 text-primary" />
          <p className="min-w-0 flex-1 text-sm">
            {checking ? t("pay.reviewTitle") : t("pay.status.pending")}
          </p>
          {pay ? (
            <ButtonLink href={localeHref(locale, payPath(pay.id))} size="sm">
              {checking ? t("common.view") : t("shop.payNow")}
            </ButtonLink>
          ) : null}
        </div>
      ) : null}

      {!stopped ? (
        <section className="rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)">
          <OrderTimeline
            status={o.status}
            labels={{
              ordered: t("shop.step.ordered"),
              processing: t("shop.step.processing"),
              shipped: t("shop.step.shipped"),
              delivered: t("shop.step.delivered"),
            }}
            dates={{
              ordered: fmt.date(o.createdAt),
              shipped: o.shippedAt ? fmt.date(o.shippedAt) : undefined,
              delivered: o.deliveredAt ? fmt.date(o.deliveredAt) : undefined,
            }}
          />
          {o.courier ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-(--radius-lg) bg-muted/50 p-3 text-sm">
              <Truck aria-hidden="true" className="size-5 text-primary" />
              <span className="min-w-0 flex-1">
                {t("shop.trackWith", { courier: o.courier, code: o.trackingCode ?? "—" })}
              </span>
              {o.trackingUrl ? (
                <a
                  href={o.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("shop.track")}
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : o.cancelReason ? (
        <p className="rounded-(--radius-xl) bg-muted/60 p-4 text-sm">
          {t("shopAdmin.reason")}: {o.cancelReason}
        </p>
      ) : null}

      <section className="grid gap-3 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)">
        <ul className="grid gap-2 text-sm">
          {o.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>
                {i.name} <span className="text-muted-foreground">× {i.qty}</span>
              </span>
              <span className="tabular-nums">{taka(fmt, i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="grid gap-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt>{t("shop.subtotal")}</dt>
            <dd className="tabular-nums">{taka(fmt, o.subtotal)}</dd>
          </div>
          {o.discount > 0 ? (
            <div className="flex justify-between text-success">
              <dt>
                {t("shop.discount")}{" "}
                {o.couponCode ? <span className="font-mono text-xs">({o.couponCode})</span> : null}
              </dt>
              <dd className="tabular-nums">−{taka(fmt, o.discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>{t("shop.deliveryFee")}</dt>
            <dd className="tabular-nums">
              {o.deliveryFee === 0 ? t("shop.free") : taka(fmt, o.deliveryFee)}
            </dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>{t("shop.total")}</dt>
            <dd className="tabular-nums">{taka(fmt, o.total)}</dd>
          </div>
          {method ? (
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("shop.payBy")}</dt>
              <dd>{method}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="grid gap-2 rounded-(--radius-xl) bg-card p-(--card-pad) text-sm shadow-(--shadow-card)">
        <h2 className="font-heading font-semibold">{t("shop.deliverTo")}</h2>
        <p className="flex gap-2">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            {o.name}, {o.address}, {districtName(o.districtId, locale) ?? ""}
          </span>
        </p>
        <p className="flex gap-2">
          <Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {o.phone}
        </p>
      </section>

      <div className="flex flex-wrap gap-2 print:hidden">
        {customerCanCancel(o.status) ? <CancelMyOrder id={o.id} /> : null}
        <PrintButton label={t("shopAdmin.invoice")} />
        <ButtonLink href={localeHref(locale, ROUTES.orders)} variant="ghost">
          {t("common.back")}
        </ButtonLink>
      </div>
      {settings.supportPhone ? (
        <p className="text-sm text-muted-foreground">{t("pay.help", { phone: settings.supportPhone })}</p>
      ) : null}
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
