import {
  ArrowLeft,
  ExternalLink,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  PhoneCall,
  Receipt,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";
import { notFound } from "next/navigation";
import { SectionCard, StatusBadge } from "@/components/layout/app-ui";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ButtonAnchor, ButtonLink } from "@/components/ui/button-link";
import { site } from "@/config";
import { adminOrderPath, ROUTES } from "@/config/routes";
import { districtName } from "@/content/places";
import { requireRole } from "@/features/auth/server";
import { WalletMark } from "@/features/payments";
import { OrderControls, OrderNote, OrderStatusBadge, OrderTimeline, PrintButton } from "@/features/shop";
import { adminOrder } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Admin · Order", robots: { index: false } };

const PAY_TONE = {
  pending: "warning",
  review: "info",
  paid: "success",
  failed: "danger",
  cancelled: "neutral",
  refund_due: "danger",
  refunded: "neutral",
} as const;

async function Order({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, adminOrderPath(id)));
  const o = await adminOrder(id);
  if (!o) notFound();
  const cod = o.paymentMethod === "cod";
  const mark = (g: string | null) =>
    g === "bkash" || g === "nagad" || g === "cod" ? (
      <WalletMark method={g} label={t(`pay.method.${g}`)} />
    ) : (
      <span className="text-muted-foreground">{g ?? "—"}</span>
    );

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 print:hidden">
        <ButtonLink
          href={localeHref(locale, ROUTES.adminShop)}
          variant="ghost"
          size="sm"
          className="justify-self-start"
        >
          <ArrowLeft aria-hidden="true" />
          {t("shopAdmin.orders")}
        </ButtonLink>
        <PrivateHeading
          title={`${t("shopAdmin.order")} #${o.number}`}
          sub={fmt.dateTime(o.createdAt)}
          icon={Receipt}
          action={<OrderStatusBadge status={o.status} t={t} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid content-start gap-6">
          {o.status === "placed" ? (
            <p className="flex items-start gap-3 rounded-(--radius-2xl) bg-warning/15 p-4 text-sm ring-1 ring-warning/40 print:hidden">
              <PhoneCall aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <span className="min-w-0 flex-1">{t("shopAdmin.callToConfirm", { phone: o.phone })}</span>
            </p>
          ) : null}
          {o.status === "pending_payment" ? (
            <div className="flex flex-wrap items-center gap-3 rounded-(--radius-2xl) bg-muted/60 p-4 text-sm print:hidden">
              <Wallet aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">{t("shopAdmin.waitingPayment")}</span>
              <ButtonLink href={localeHref(locale, ROUTES.adminPayments)} size="sm" variant="outline">
                {t("payAdmin.title")}
              </ButtonLink>
            </div>
          ) : null}

          <SectionCard
            title={t("shopui.admin.nextStep")}
            description={t("shopui.admin.nextStepSub")}
            icon={Truck}
            className="print:hidden"
          >
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
              />
              <OrderControls id={o.id} status={o.status} cod={cod} />
              {o.courier ? (
                <p className="flex flex-wrap items-center gap-2 rounded-(--radius-xl) bg-muted/60 p-3 text-sm">
                  <Truck aria-hidden="true" className="size-4 text-primary" />
                  <strong>{t("shopAdmin.courier")}:</strong> {o.courier} ·{" "}
                  <span className="font-mono">{o.trackingCode ?? "—"}</span>
                  {o.trackingUrl ? (
                    <a
                      href={o.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      {t("shop.track")}
                      <ExternalLink aria-hidden="true" className="size-3.5" />
                    </a>
                  ) : null}
                </p>
              ) : null}
            </div>
          </SectionCard>

          {/* The invoice: also what prints. */}
          <section className="grid gap-5 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-6 print:p-0 print:shadow-none print:ring-0">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-heading text-lg font-bold">{site.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t("shopAdmin.invoice")} #{o.number} · {fmt.date(o.createdAt)}
                </p>
              </div>
              <PrintButton label={t("shopAdmin.print")} />
            </header>
            <div className="grid gap-1 text-sm">
              <p className="font-semibold">{o.name}</p>
              <p className="text-pretty">
                {o.address}, {districtName(o.districtId, locale) ?? ""}
              </p>
              <p className="tabular-nums">{o.phone}</p>
              {o.note ? (
                <p className="mt-1 rounded-(--radius-md) bg-muted/60 px-3 py-2 text-muted-foreground">
                  “{o.note}”
                </p>
              ) : null}
            </div>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[20rem] text-sm">
                <thead className="text-start text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th scope="col" className="py-2 pe-3 text-start font-semibold">
                      {t("shopAdmin.items")}
                    </th>
                    <th scope="col" className="py-2 pe-3 text-end font-semibold">
                      {t("shopAdmin.qty")}
                    </th>
                    <th scope="col" className="py-2 text-end font-semibold">
                      {t("shopAdmin.total")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {o.items.map((i) => (
                    <tr key={i.id}>
                      <td className="py-2.5 pe-3">{i.name}</td>
                      <td className="py-2.5 pe-3 text-end whitespace-nowrap tabular-nums">
                        {fmt.number(i.qty)} × {taka(fmt, i.price)}
                      </td>
                      <td className="py-2.5 text-end font-medium tabular-nums">
                        {taka(fmt, i.price * i.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ms-auto grid w-full max-w-xs gap-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("shop.subtotal")}</dt>
                <dd className="tabular-nums">{taka(fmt, o.subtotal)}</dd>
              </div>
              {o.discount > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">
                    {t("shop.discount")} {o.couponCode ? `(${o.couponCode})` : ""}
                  </dt>
                  <dd className="tabular-nums">−{taka(fmt, o.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("shop.deliveryFee")}</dt>
                <dd className="tabular-nums">{taka(fmt, o.deliveryFee)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t pt-2">
                <dt className="font-semibold">{t("shop.total")}</dt>
                <dd className="font-heading text-xl font-bold tabular-nums">{taka(fmt, o.total)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("shop.payBy")}</dt>
                <dd>{mark(o.paymentMethod)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="grid content-start gap-4 print:hidden">
          <SectionCard title={t("shopAdmin.customer")} icon={UserRound}>
            <div className="grid gap-2 text-sm">
              <p className="font-medium">{o.customer?.fullName ?? o.name}</p>
              {o.customer?.email ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">{o.customer.email}</span>
                </p>
              ) : null}
              <p className="flex items-start gap-2 text-muted-foreground">
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{districtName(o.districtId, locale) ?? "—"}</span>
              </p>
              <ButtonAnchor href={`tel:${o.phone}`} variant="brand" className="mt-1 w-full">
                <Phone aria-hidden="true" />
                {o.phone}
              </ButtonAnchor>
            </div>
          </SectionCard>
          <SectionCard title={t("shopAdmin.payment")} icon={Wallet} bodyClassName="p-3 sm:p-3">
            {o.payments.length === 0 ? (
              <p className="p-1 text-sm text-muted-foreground">{t("shopui.admin.noPayments")}</p>
            ) : (
              <ul className="grid gap-2">
                {o.payments.map((p) => (
                  <li key={p.id} className="grid gap-1.5 rounded-(--radius-lg) bg-muted/50 p-3 text-sm">
                    <span className="flex items-center justify-between gap-2">
                      {mark(p.gateway)}
                      <StatusBadge tone={PAY_TONE[p.status]}>{t(`pay.status.${p.status}`)}</StatusBadge>
                    </span>
                    <span className="font-semibold tabular-nums">{taka(fmt, p.amount + p.fee)}</span>
                    {p.gatewayTxId ? (
                      <span className="font-mono text-xs select-all">{p.gatewayTxId.split(":")[1]}</span>
                    ) : null}
                    {p.payerPhone ? (
                      <span className="text-xs text-muted-foreground tabular-nums">{p.payerPhone}</span>
                    ) : null}
                    {p.refundRef ? (
                      <span className="text-xs text-muted-foreground">
                        {t("pay.status.refunded")}: <span className="font-mono">{p.refundRef}</span>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard title={t("shopAdmin.note")} icon={NotebookPen}>
            <OrderNote id={o.id} initial={o.adminNote ?? ""} />
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

export default function AdminOrderPage({ params }: PageProps<"/[locale]/admin/shop/orders/[id]">) {
  return (
    <Private rows={6}>
      <Order params={params} />
    </Private>
  );
}
