import { BadgeCheck, Banknote, CalendarClock, Hourglass, Percent, Send, Wallet } from "lucide-react";
import {
  DataTable,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatGrid,
  StatusBadge,
  type Column,
} from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { vetLedger } from "@/features/payments/server";
import { requireVet } from "@/features/providers/server";
import type { MessageKey } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Earnings", robots: { index: false } };

const DAY_KEYS: readonly MessageKey[] = [
  "appt.sun",
  "appt.mon",
  "appt.tue",
  "appt.wed",
  "appt.thu",
  "appt.fri",
  "appt.sat",
];

/** Read once per request (outside the component body, see lib/time.ts). */
const requestNow = () => new Date();

type Ledger = Awaited<ReturnType<typeof vetLedger>>;
type Line = Ledger["lines"][number];
type Payout = Ledger["payouts"][number];

async function Earnings() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { provider } = await requireVet(locale, localeHref(locale, ROUTES.vetEarnings));
  const { balance, lines, payouts, month } = await vetLedger(provider.id);
  const now = requestNow().getTime();
  const pct = fmt.number(business.consult.commissionBps / 100);
  const min = taka(fmt, business.payout.minimum);
  const paidOut = payouts.reduce((n, p) => n + p.amount, 0);

  const lineColumns: Column<Line>[] = [
    {
      key: "what",
      header: t("earn.what"),
      mobile: "title",
      cell: (l) => (
        <span className="font-medium">
          {l.kind === "payout"
            ? t("earn.payout")
            : (l.memo ?? (l.amount < 0 ? t("vetui.earn.refund") : t("vetui.earn.chat")))}
        </span>
      ),
    },
    {
      key: "date",
      header: t("common.date"),
      className: "whitespace-nowrap text-muted-foreground",
      cell: (l) => <time dateTime={l.createdAt.toISOString()}>{fmt.date(l.createdAt)}</time>,
    },
    {
      key: "status",
      header: t("vetui.earn.status"),
      cell: (l) =>
        l.kind === "payout" ? (
          <StatusBadge tone="neutral">{t("vetui.earn.sent")}</StatusBadge>
        ) : l.amount < 0 ? (
          <StatusBadge tone="danger">{t("vetui.earn.refund")}</StatusBadge>
        ) : !l.availableAt || l.availableAt.getTime() <= now ? (
          <StatusBadge tone="success">{t("vetui.earn.ready")}</StatusBadge>
        ) : (
          <StatusBadge tone="warning">
            {t("vetui.earn.onHold", { date: fmt.date(l.availableAt, { day: "numeric", month: "short" }) })}
          </StatusBadge>
        ),
    },
    {
      key: "amount",
      header: t("common.amount"),
      className: "text-end tabular-nums",
      cell: (l) => (
        <span className={cn("font-semibold tabular-nums", l.amount < 0 && "text-muted-foreground")}>
          {taka(fmt, l.amount)}
        </span>
      ),
    },
  ];

  const payoutColumns: Column<Payout>[] = [
    {
      key: "amount",
      header: t("common.amount"),
      mobile: "title",
      cell: (p) => <span className="font-semibold tabular-nums">{taka(fmt, p.amount)}</span>,
    },
    {
      key: "date",
      header: t("common.date"),
      className: "whitespace-nowrap text-muted-foreground",
      cell: (p) => <time dateTime={p.createdAt.toISOString()}>{fmt.date(p.createdAt)}</time>,
    },
    {
      key: "method",
      header: t("vetui.earn.method"),
      cell: (p) => <span className="capitalize">{p.method}</span>,
    },
    {
      key: "ref",
      header: t("vetui.earn.reference"),
      className: "text-muted-foreground",
      cell: (p) => <span className="break-all">{p.reference ?? "—"}</span>,
    },
  ];

  const how = [
    { icon: Hourglass, text: t("vetui.earn.how1") },
    {
      icon: CalendarClock,
      text: t("vetui.earn.how2", { day: t(DAY_KEYS[business.payout.weekday] ?? "appt.tue"), min }),
    },
    { icon: Percent, text: t("vetui.earn.how3", { pct }) },
    { icon: Send, text: t("vetui.earn.how4") },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader icon={Wallet} title={t("vet.earnings")} sub={t("earn.sub", { min, pct })} />

      <StatGrid className="md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("vetui.stat.month")}
          value={taka(fmt, month)}
          hint={t("vetui.earn.monthHint", { pct })}
          icon={Banknote}
          tone="primary"
        />
        <StatCard
          label={t("earn.available")}
          value={taka(fmt, balance.available)}
          hint={t("vetui.earn.availableHint", { min })}
          icon={BadgeCheck}
          tone="success"
        />
        <StatCard
          label={t("earn.pending")}
          value={taka(fmt, balance.pending)}
          hint={t("vetui.earn.pendingHint")}
          icon={Hourglass}
          tone={balance.pending > 0 ? "warning" : "default"}
        />
        <StatCard
          label={t("earn.paidOut")}
          value={taka(fmt, paidOut)}
          hint={t("vetui.earn.paidHint", { n: fmt.number(payouts.length) })}
          icon={Send}
        />
      </StatGrid>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-6">
          <section aria-labelledby="earn-lines-h" className="grid gap-3">
            <h2 id="earn-lines-h" className="font-heading text-lg font-bold">
              {t("earn.lines")}
            </h2>
            <DataTable
              rows={lines}
              columns={lineColumns}
              rowKey={(l) => String(l.id)}
              caption={t("earn.lines")}
              empty={
                <EmptyState
                  icon={Wallet}
                  title={t("earn.empty")}
                  action={
                    <ButtonLink href={localeHref(locale, ROUTES.dashboard)} variant="outline" size="sm">
                      {t("vet.home")}
                    </ButtonLink>
                  }
                />
              }
            />
          </section>

          <section aria-labelledby="earn-payouts-h" className="grid gap-3">
            <h2 id="earn-payouts-h" className="font-heading text-lg font-bold">
              {t("earn.payouts")}
            </h2>
            <DataTable
              rows={payouts}
              columns={payoutColumns}
              rowKey={(p) => p.id}
              caption={t("earn.payouts")}
              empty={
                <p className="rounded-(--radius-xl) bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-foreground/6">
                  {t("vetui.earn.payoutsEmpty")}
                </p>
              }
            />
          </section>
        </div>

        <aside className="xl:sticky xl:top-24">
          <SectionCard title={t("vetui.earn.howTitle")} icon={Banknote}>
            <ul className="grid gap-3 text-sm">
              {how.map((h) => (
                <li key={h.text} className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-(--radius-md) bg-primary/10 text-primary">
                    <h.icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="text-pretty text-muted-foreground">{h.text}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

function EarningsSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-(--radius-2xl)" />
        ))}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-3">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-px overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-56 rounded-(--radius-2xl) max-xl:hidden" />
      </div>
    </div>
  );
}

export default function EarningsPage() {
  return (
    <SuspenseReveal fallback={<EarningsSkeleton />}>
      <Earnings />
    </SuspenseReveal>
  );
}
