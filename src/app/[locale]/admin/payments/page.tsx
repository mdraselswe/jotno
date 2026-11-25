import { BadgeCheck, CircleCheckBig, Clock, ReceiptText, Undo2, Wallet } from "lucide-react";
import Link from "next/link";
import {
  DataTable,
  EmptyState,
  SectionCard,
  StatCard,
  StatGrid,
  StatusBadge,
  type Column,
} from "@/components/layout/app-ui";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { requireRole } from "@/features/auth/server";
import { AutoRefresh, RefundSent, ReviewPayment, WalletMark } from "@/features/payments";
import { paymentQueues, type QueuedPayment } from "@/features/payments/server";
import { getSettings } from "@/features/settings/server";
import type { Translate } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { adminMetadata } from "@/features/admin/server";

export async function generateMetadata() {
  return adminMetadata("payAdmin.title");
}

const trxOf = (p: QueuedPayment) => p.gatewayTxId?.split(":")[1] ?? "—";

function Method({ g, t }: { g: string | null; t: Translate }) {
  return g === "bkash" || g === "nagad" || g === "cod" ? (
    <WalletMark method={g} label={t(`pay.method.${g}`)} />
  ) : (
    <span className="text-muted-foreground">{g ?? "—"}</span>
  );
}

function Who({ p, locale }: { p: QueuedPayment; locale: string }) {
  return (
    <span className="grid min-w-0 flex-1">
      <Link href={localeHref(locale, p.back)} className="truncate font-semibold hover:underline">
        {p.target.title}
        {p.target.detail ? (
          <span className="font-normal text-muted-foreground"> · {p.target.detail}</span>
        ) : null}
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
  const toCheck = review.reduce((n, p) => n + p.amount + p.fee, 0);
  const toRefund = refunds.reduce((n, p) => n + p.amount + p.fee, 0);

  const recentCols: Column<QueuedPayment>[] = [
    {
      key: "for",
      header: t("pay.for"),
      mobile: "title",
      cell: (p) => <span className="line-clamp-1">{p.target.title}</span>,
    },
    {
      key: "amount",
      header: t("common.amount"),
      className: "text-end",
      cell: (p) => <span className="font-semibold tabular-nums">{taka(fmt, p.amount + p.fee)}</span>,
    },
    { key: "method", header: t("admin.method"), cell: (p) => <Method g={p.gateway} t={t} /> },
    {
      key: "trx",
      header: t("payAdmin.trx"),
      cell: (p) => <span className="font-mono text-xs select-all">{trxOf(p)}</span>,
    },
    {
      key: "status",
      header: t("shopAdmin.payment"),
      cell: (p) => (
        <StatusBadge tone={p.status === "paid" ? "success" : "neutral"}>
          {t(`pay.status.${p.status}`)}
        </StatusBadge>
      ),
    },
    {
      key: "when",
      header: t("admin.when"),
      cell: (p) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {fmt.dateTime(p.reviewedAt ?? p.paidAt ?? p.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="grid gap-6">
      <AutoRefresh seconds={30} />
      <PrivateHeading title={t("payAdmin.title")} sub={t("payAdmin.sub")} icon={Wallet} />

      <StatGrid>
        <StatCard
          label={t("payAdmin.review")}
          value={fmt.number(review.length)}
          hint={review.length > 0 ? taka(fmt, toCheck) : t("payui.admin.allClear")}
          icon={Clock}
          tone={review.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label={t("payAdmin.refunds")}
          value={fmt.number(refunds.length)}
          hint={refunds.length > 0 ? taka(fmt, toRefund) : t("payui.admin.allClear")}
          icon={Undo2}
          tone={refunds.length > 0 ? "danger" : "default"}
        />
        <StatCard label={t("payAdmin.recent")} value={fmt.number(recent.length)} icon={CircleCheckBig} />
      </StatGrid>

      <section className="grid gap-3" aria-labelledby="pay-review">
        <h2 id="pay-review" className="flex items-center gap-2 font-heading text-lg font-bold">
          <Clock aria-hidden="true" className="size-5 text-primary" />
          {t("payAdmin.review")}
          {review.length ? <StatusBadge tone="warning">{fmt.number(review.length)}</StatusBadge> : null}
        </h2>
        {review.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title={t("payAdmin.emptyReview")}
            body={t("payui.admin.reviewEmptySub")}
          />
        ) : (
          <ul className="grid gap-3">
            {review.map((p) => {
              const wallet = p.gateway === "bkash" || p.gateway === "nagad" ? settings[p.gateway] : null;
              return (
                <li key={p.id}>
                  <SectionCard bodyClassName="grid gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Method g={p.gateway} t={t} />
                      <Who p={p} locale={locale} />
                      <span className="text-xs text-muted-foreground">
                        {p.submittedAt ? fmt.dateTime(p.submittedAt) : ""}
                      </span>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 rounded-(--radius-xl) bg-muted/50 p-3 text-sm sm:grid-cols-4">
                      <div className="grid min-w-0 gap-0.5">
                        <dt className="text-xs text-muted-foreground">{t("payAdmin.trx")}</dt>
                        <dd className="truncate font-mono text-base font-bold tracking-wider select-all">
                          {trxOf(p)}
                        </dd>
                      </div>
                      <div className="grid min-w-0 gap-0.5">
                        <dt className="text-xs text-muted-foreground">{t("payAdmin.from")}</dt>
                        <dd className="truncate font-mono select-all">{p.payerPhone}</dd>
                      </div>
                      <div className="grid min-w-0 gap-0.5">
                        <dt className="text-xs text-muted-foreground">{t("payAdmin.received")}</dt>
                        <dd className="font-heading text-base font-bold tabular-nums">
                          {taka(fmt, p.amount + p.fee)}
                        </dd>
                      </div>
                      <div className="grid min-w-0 gap-0.5">
                        <dt className="text-xs text-muted-foreground">{t("settingsAdmin.number")}</dt>
                        <dd className="truncate font-mono">{wallet?.number || "—"}</dd>
                      </div>
                    </dl>
                    <p className="text-xs text-muted-foreground">{t("payui.admin.checkHint")}</p>
                    <ReviewPayment id={p.id} />
                  </SectionCard>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-3" aria-labelledby="pay-refunds">
        <h2 id="pay-refunds" className="flex items-center gap-2 font-heading text-lg font-bold">
          <Undo2 aria-hidden="true" className="size-5 text-primary" />
          {t("payAdmin.refunds")}
          {refunds.length ? <StatusBadge tone="danger">{fmt.number(refunds.length)}</StatusBadge> : null}
        </h2>
        {refunds.length === 0 ? (
          <EmptyState icon={BadgeCheck} title={t("payAdmin.emptyRefunds")} />
        ) : (
          <ul className="grid gap-3">
            {refunds.map((p) => (
              <li key={p.id}>
                <SectionCard bodyClassName="grid gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Who p={p} locale={locale} />
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      {t("payAdmin.sendBack")}:
                      <strong className="font-heading text-base tabular-nums">
                        {taka(fmt, p.amount + p.fee)}
                      </strong>
                      <Method g={p.gateway} t={t} />
                      <span className="font-mono select-all">{p.payerPhone ?? "—"}</span>
                    </span>
                  </div>
                  {p.note ? (
                    <p className="rounded-(--radius-md) bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                      {t("payAdmin.reason")}: {p.note}
                    </p>
                  ) : null}
                  <RefundSent id={p.id} />
                </SectionCard>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3" aria-labelledby="pay-recent">
        <h2 id="pay-recent" className="flex items-center gap-2 font-heading text-lg font-bold">
          <ReceiptText aria-hidden="true" className="size-5 text-primary" />
          {t("payAdmin.recent")}
        </h2>
        <DataTable
          rows={recent}
          columns={recentCols}
          rowKey={(p) => p.id}
          rowHref={(p) => localeHref(locale, p.back)}
          caption={t("payAdmin.recent")}
          empty={<EmptyState icon={ReceiptText} title={t("admin.empty")} />}
        />
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
