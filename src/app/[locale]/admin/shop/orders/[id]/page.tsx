import { ExternalLink, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ButtonAnchor, ButtonLink } from "@/components/ui/button-link";
import { site } from "@/config";
import { adminOrderPath, ROUTES } from "@/config/routes";
import { districtName } from "@/content/places";
import { requireRole } from "@/features/auth/server";
import { ORDER_STATUS, OrderControls, OrderNote, OrderTimeline, PrintButton } from "@/features/shop";
import { adminOrder } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Admin · Order", robots: { index: false } };

async function Order({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, adminOrderPath(id)));
  const o = await adminOrder(id);
  if (!o) notFound();
  const cod = o.paymentMethod === "cod";
  const method = (g: string | null) =>
    g === "bkash" || g === "nagad" || g === "cod" ? t(`pay.method.${g}`) : (g ?? "—");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="grid content-start gap-6">
        <PrivateHeading
          title={`${t("shopAdmin.order")} #${o.number}`}
          sub={fmt.dateTime(o.createdAt)}
          action={<Badge>{t(ORDER_STATUS[o.status])}</Badge>}
        />

        {o.status === "placed" ? (
          <p className="rounded-(--radius-xl) bg-highlight/25 p-4 text-sm print:hidden">
            {t("shopAdmin.callToConfirm", { phone: o.phone })}
          </p>
        ) : null}
        {o.status === "pending_payment" ? (
          <p className="flex flex-wrap items-center gap-3 rounded-(--radius-xl) bg-muted/60 p-4 text-sm print:hidden">
            <span className="flex-1">{t("shopAdmin.waitingPayment")}</span>
            <ButtonLink href={localeHref(locale, ROUTES.adminPayments)} size="sm" variant="outline">
              {t("payAdmin.title")}
            </ButtonLink>
          </p>
        ) : null}

        <section className="grid gap-4 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card) print:hidden">
          <OrderTimeline
            status={o.status}
            labels={{
              ordered: t("shop.step.ordered"),
              processing: t("shop.step.processing"),
              shipped: t("shop.step.shipped"),
              delivered: t("shop.step.delivered"),
            }}
          />
          <OrderControls id={o.id} status={o.status} cod={cod} />
          {o.courier ? (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <strong>{t("shopAdmin.courier")}:</strong> {o.courier} · {o.trackingCode ?? "—"}
              {o.trackingUrl ? (
                <a
                  href={o.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary"
                >
                  {t("shop.track")}
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              ) : null}
            </p>
          ) : null}
          {o.cancelReason ? (
            <p className="text-sm text-muted-foreground">
              {t("shopAdmin.reason")}: {o.cancelReason}
            </p>
          ) : null}
        </section>

        {/* The invoice: also what prints. */}
        <section className="grid gap-4 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card) print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-heading text-lg font-semibold">{site.name}</p>
              <p className="text-sm text-muted-foreground">
                {t("shopAdmin.invoice")} #{o.number} · {fmt.date(o.createdAt)}
              </p>
            </div>
            <PrintButton label={t("shopAdmin.print")} />
          </header>
          <div className="grid gap-1 text-sm">
            <p className="font-medium">{o.name}</p>
            <p>
              {o.address}, {districtName(o.districtId, locale) ?? ""}
            </p>
            <p>{o.phone}</p>
            {o.note ? <p className="text-muted-foreground">“{o.note}”</p> : null}
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">{t("shopAdmin.items")}</th>
                <th className="py-2 pr-3 text-right font-medium">{t("shopAdmin.qty")}</th>
                <th className="py-2 text-right font-medium">{t("shopAdmin.total")}</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="py-2 pr-3">{i.name}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {i.qty} × {taka(fmt, i.price)}
                  </td>
                  <td className="py-2 text-right tabular-nums">{taka(fmt, i.price * i.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="ml-auto grid w-full max-w-xs gap-1 text-sm">
            <div className="flex justify-between">
              <dt>{t("shop.subtotal")}</dt>
              <dd className="tabular-nums">{taka(fmt, o.subtotal)}</dd>
            </div>
            {o.discount > 0 ? (
              <div className="flex justify-between">
                <dt>
                  {t("shop.discount")} {o.couponCode ? `(${o.couponCode})` : ""}
                </dt>
                <dd className="tabular-nums">−{taka(fmt, o.discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>{t("shop.deliveryFee")}</dt>
              <dd className="tabular-nums">{taka(fmt, o.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-1 text-base font-semibold">
              <dt>{t("shop.total")}</dt>
              <dd className="tabular-nums">{taka(fmt, o.total)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("shop.payBy")}</dt>
              <dd>{method(o.paymentMethod)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <aside className="grid content-start gap-4 print:hidden">
        <section className="grid gap-2 rounded-(--radius-xl) bg-card p-(--card-pad) text-sm shadow-(--shadow-card)">
          <h2 className="font-heading font-semibold">{t("shopAdmin.customer")}</h2>
          <p>{o.customer?.fullName ?? o.name}</p>
          {o.customer?.email ? <p className="truncate text-muted-foreground">{o.customer.email}</p> : null}
          <ButtonAnchor href={`tel:${o.phone}`} size="sm" variant="secondary" className="justify-self-start">
            <Phone aria-hidden="true" />
            {o.phone}
          </ButtonAnchor>
        </section>
        <section className="grid gap-2 rounded-(--radius-xl) bg-card p-(--card-pad) text-sm shadow-(--shadow-card)">
          <h2 className="font-heading font-semibold">{t("shopAdmin.payment")}</h2>
          {o.payments.length === 0 ? (
            <p className="text-muted-foreground">—</p>
          ) : (
            <ul className="grid gap-2">
              {o.payments.map((p) => (
                <li key={p.id} className="grid gap-0.5 rounded-(--radius-lg) bg-muted/50 p-2">
                  <span className="flex items-center justify-between gap-2">
                    <span>{method(p.gateway)}</span>
                    <Badge variant={p.status === "paid" ? "default" : "secondary"}>
                      {t(`pay.status.${p.status}`)}
                    </Badge>
                  </span>
                  <span className="tabular-nums">{taka(fmt, p.amount + p.fee)}</span>
                  {p.gatewayTxId ? (
                    <span className="font-mono text-xs">{p.gatewayTxId.split(":")[1]}</span>
                  ) : null}
                  {p.payerPhone ? (
                    <span className="text-xs text-muted-foreground">{p.payerPhone}</span>
                  ) : null}
                  {p.refundRef ? (
                    <span className="text-xs text-muted-foreground">
                      {t("pay.status.refunded")}: {p.refundRef}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)">
          <OrderNote id={o.id} initial={o.adminNote ?? ""} />
        </section>
      </aside>
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
