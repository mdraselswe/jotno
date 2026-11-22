import Link from "next/link";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/routes";
import { requireRole } from "@/features/auth/server";
import { AutoRefresh, RefundSent, ReviewPayment } from "@/features/payments";
import { paymentQueues, type QueuedPayment } from "@/features/payments/server";
import { getSettings } from "@/features/settings/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Payments", robots: { index: false } };

const WALLET_CHIP: Record<string, string> = {
  bkash: "bg-bkash text-white",
  nagad: "bg-nagad text-white",
};

const trxOf = (p: QueuedPayment) => p.gatewayTxId?.split(":")[1] ?? "—";

function Who({ p, locale }: { p: QueuedPayment; locale: string }) {
  return (
    <span className="grid min-w-0 flex-1">
      <Link href={localeHref(locale, p.back)} className="truncate font-medium hover:underline">
        {p.target.title}
        {p.target.detail ? <span className="text-muted-foreground"> · {p.target.detail}</span> : null}
      </Link>
      <span className="truncate text-xs text-muted-foreground">
        {[p.payer?.name, p.payer?.email].filter(Boolean).join(" · ")}
      </span>
    </span>
  );
}

async function Payments() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminPayments));
  const [{ review, refunds, recent }, settings] = await Promise.all([paymentQueues(locale), getSettings()]);

  const method = (g: string | null) =>
    g === "bkash" || g === "nagad" || g === "cod" ? t(`pay.method.${g}`) : (g ?? "—");

  return (
    <div className="grid gap-8">
      <AutoRefresh seconds={30} />
      <PrivateHeading title={t("payAdmin.title")} sub={t("payAdmin.sub")} />

      <section className="grid gap-3">
        <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
          {t("payAdmin.review")}
          {review.length ? <Badge>{review.length}</Badge> : null}
        </h2>
        {review.length === 0 ? (
          <p className="text-muted-foreground">{t("payAdmin.emptyReview")}</p>
        ) : (
          <ul className="grid gap-3">
            {review.map((p) => {
              const wallet = p.gateway === "bkash" || p.gateway === "nagad" ? settings[p.gateway] : null;
              return (
                <li
                  key={p.id}
                  className="grid gap-3 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        WALLET_CHIP[p.gateway ?? ""] ?? "bg-muted",
                      )}
                    >
                      {method(p.gateway)}
                    </span>
                    <Who p={p} locale={locale} />
                    <span className="text-xs text-muted-foreground">
                      {p.submittedAt ? fmt.dateTime(p.submittedAt) : ""}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 rounded-(--radius-lg) bg-muted/50 p-3 text-sm sm:grid-cols-4">
                    <div className="grid">
                      <dt className="text-xs text-muted-foreground">{t("payAdmin.trx")}</dt>
                      <dd className="font-mono font-semibold tracking-wider select-all">{trxOf(p)}</dd>
                    </div>
                    <div className="grid">
                      <dt className="text-xs text-muted-foreground">{t("payAdmin.from")}</dt>
                      <dd className="font-mono select-all">{p.payerPhone}</dd>
                    </div>
                    <div className="grid">
                      <dt className="text-xs text-muted-foreground">{t("payAdmin.received")}</dt>
                      <dd className="font-semibold tabular-nums">{taka(fmt, p.amount + p.fee)}</dd>
                    </div>
                    <div className="grid">
                      <dt className="text-xs text-muted-foreground">{t("settingsAdmin.number")}</dt>
                      <dd className="font-mono">{wallet?.number || "—"}</dd>
                    </div>
                  </dl>
                  <ReviewPayment id={p.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
          {t("payAdmin.refunds")}
          {refunds.length ? <Badge variant="destructive">{refunds.length}</Badge> : null}
        </h2>
        {refunds.length === 0 ? (
          <p className="text-muted-foreground">{t("payAdmin.emptyRefunds")}</p>
        ) : (
          <ul className="grid gap-3">
            {refunds.map((p) => (
              <li
                key={p.id}
                className="grid gap-3 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Who p={p} locale={locale} />
                  <span className="text-sm">
                    {t("payAdmin.sendBack")}:{" "}
                    <strong className="tabular-nums">{taka(fmt, p.amount + p.fee)}</strong> →{" "}
                    {method(p.gateway)} <span className="font-mono select-all">{p.payerPhone ?? "—"}</span>
                  </span>
                </div>
                {p.note ? (
                  <p className="text-sm text-muted-foreground">
                    {t("payAdmin.reason")}: {p.note}
                  </p>
                ) : null}
                <RefundSent id={p.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="font-heading text-xl font-semibold">{t("payAdmin.recent")}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-(--radius-xl) bg-card p-2 shadow-(--shadow-card)">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("admin.when")}</th>
                  <th className="px-3 py-2 font-medium">{t("pay.for")}</th>
                  <th className="px-3 py-2 font-medium">{t("common.amount")}</th>
                  <th className="px-3 py-2 font-medium">{t("admin.method")}</th>
                  <th className="px-3 py-2 font-medium">{t("payAdmin.trx")}</th>
                  <th className="px-3 py-2 font-medium">{t("shopAdmin.payment")}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {fmt.dateTime(p.reviewedAt ?? p.paidAt ?? p.createdAt)}
                    </td>
                    <td className="px-3 py-2">{p.target.title}</td>
                    <td className="px-3 py-2 tabular-nums">{taka(fmt, p.amount + p.fee)}</td>
                    <td className="px-3 py-2">{method(p.gateway)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{trxOf(p)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={p.status === "paid" ? "default" : "secondary"}>
                        {t(`pay.status.${p.status}`)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminPaymentsPage() {
  return (
    <Private rows={4}>
      <Payments />
    </Private>
  );
}
