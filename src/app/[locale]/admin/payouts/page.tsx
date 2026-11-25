import { Clock, HandCoins, History, Undo2, Wallet } from "lucide-react";
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
import { business } from "@/config";
import { adminConsultPath, adminVetPath, ROUTES } from "@/config/routes";
import { AdminListSkeleton, PayoutForm, RefundButton } from "@/features/admin";
import { payoutQueue, recentPayouts, recentRefundable } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { PayoutAccountView } from "@/features/providers";
import { payoutAccountsFor } from "@/features/providers/server";
import type { MessageKey } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import Link from "next/link";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("adminui.meta.title", { page: t("admin.payouts") }), robots: { index: false } };
}

const METHOD: Record<string, MessageKey> = {
  bkash: "pay.method.bkash",
  nagad: "pay.method.nagad",
  bank: "adminui.payout.bank",
};

async function Payouts() {
  const [locale, t, fmt] = await Promise.all([getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminPayouts));
  const [queue, done, refundable] = await Promise.all([payoutQueue(), recentPayouts(), recentRefundable()]);
  // Where each vet wants the money (private; admins only).
  const accounts = await payoutAccountsFor(queue.map((v) => v.providerId));
  const ready = queue.filter((v) => v.ready);
  const readyTotal = ready.reduce((s, v) => s + v.balance.available, 0);
  const pendingTotal = queue.reduce((s, v) => s + v.balance.pending, 0);

  type Paid = (typeof done)[number];
  const paidColumns: Column<Paid>[] = [
    { key: "vet", header: t("admin.vet"), mobile: "title", cell: (p) => p.name },
    {
      key: "amount",
      header: t("common.amount"),
      className: "tabular-nums font-semibold",
      cell: (p) => taka(fmt, p.amount),
    },
    {
      key: "method",
      header: t("admin.method"),
      cell: (p) => (METHOD[p.method] ? t(METHOD[p.method] as MessageKey) : p.method),
    },
    {
      key: "ref",
      header: t("admin.reference"),
      className: "font-mono text-xs",
      cell: (p) => <span className="break-all">{p.reference}</span>,
    },
    {
      key: "when",
      header: t("admin.when"),
      className: "whitespace-nowrap text-muted-foreground",
      cell: (p) => fmt.dateTime(p.createdAt),
    },
  ];

  type Open = (typeof refundable)[number];
  const openColumns: Column<Open>[] = [
    {
      key: "chat",
      header: t("adminui.payout.chat"),
      mobile: "title",
      cell: (c) => (
        <span className="grid min-w-0">
          <Link href={localeHref(locale, adminConsultPath(c.id))} className="line-clamp-1 hover:underline">
            {c.summary}
          </Link>
          <span className="text-xs font-normal text-muted-foreground">{c.vet}</span>
        </span>
      ),
    },
    {
      key: "opened",
      header: t("monitor.opened"),
      className: "whitespace-nowrap text-muted-foreground",
      cell: (c) => (c.openedAt ? fmt.dateTime(c.openedAt) : "—"),
    },
    { key: "fee", header: t("monitor.fee"), className: "tabular-nums", cell: (c) => taka(fmt, c.fee) },
    {
      key: "refund",
      header: <span className="sr-only">{t("common.actions")}</span>,
      className: "text-end",
      cell: (c) => <RefundButton consultId={c.id} amount={taka(fmt, c.fee)} />,
    },
  ];

  return (
    <div className="grid gap-8">
      <PageHeader title={t("admin.payouts")} sub={t("admin.payoutHint")} icon={HandCoins} />
      <StatGrid>
        <StatCard
          label={t("adminui.payout.readyTotal")}
          value={taka(fmt, readyTotal)}
          hint={t("adminui.payout.readyVets", { n: fmt.number(ready.length) })}
          icon={Wallet}
          tone={readyTotal > 0 ? "primary" : "default"}
        />
        <StatCard
          label={t("adminui.payout.pendingTotal")}
          value={taka(fmt, pendingTotal)}
          hint={t("adminui.payout.pendingHint")}
          icon={Clock}
        />
        <StatCard
          label={t("adminui.payout.minimum")}
          value={taka(fmt, business.payout.minimum)}
          icon={HandCoins}
        />
      </StatGrid>

      <section className="grid gap-3" aria-labelledby="payout-queue">
        <h2 id="payout-queue" className="font-heading text-lg font-semibold">
          {t("adminui.payout.queue")}
        </h2>
        {queue.length === 0 ? (
          <EmptyState icon={Wallet} title={t("adminui.payout.empty")} body={t("adminui.payout.emptyBody")} />
        ) : (
          <ul className="grid gap-3">
            {queue.map((v) => (
              <li
                key={v.providerId}
                className="grid gap-4 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <span className="grid min-w-0 gap-0.5">
                    <Link
                      href={localeHref(locale, adminVetPath(v.providerId))}
                      className="truncate font-semibold hover:underline"
                    >
                      {v.name}
                    </Link>
                    <span className="truncate text-xs text-muted-foreground">
                      {[v.phone, v.email].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </span>
                  <StatusBadge tone={v.ready ? "success" : "neutral"}>
                    {v.ready ? t("admin.available") : t("adminui.payout.belowMin")}
                  </StatusBadge>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:max-w-md">
                  <div className="grid gap-0.5">
                    <dt className="text-xs text-muted-foreground">{t("admin.available")}</dt>
                    <dd className="font-heading text-xl font-bold tabular-nums">
                      {taka(fmt, v.balance.available)}
                    </dd>
                  </div>
                  <div className="grid gap-0.5">
                    <dt className="text-xs text-muted-foreground">{t("admin.pending")}</dt>
                    <dd className="font-heading text-xl font-bold text-muted-foreground tabular-nums">
                      {taka(fmt, v.balance.pending)}
                    </dd>
                  </div>
                </dl>
                <PayoutAccountView account={accounts.get(v.providerId) ?? null} name={v.name} />
                {v.balance.available > 0 ? (
                  <div className="border-t pt-4">
                    <PayoutForm providerId={v.providerId} max={v.balance.available} name={v.name} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <SectionCard title={t("admin.recentPayouts")} icon={History} bodyClassName="p-0 sm:p-0">
        <div className="p-3 sm:p-4">
          <DataTable
            rows={done}
            columns={paidColumns}
            rowKey={(p) => p.id}
            caption={t("admin.recentPayouts")}
            empty={<p className="p-2 text-sm text-muted-foreground">{t("adminui.payout.noneYet")}</p>}
          />
        </div>
      </SectionCard>

      <section className="grid gap-3" aria-labelledby="open-chats">
        <div className="grid gap-1">
          <h2 id="open-chats" className="flex items-center gap-2 font-heading text-lg font-semibold">
            <Undo2 aria-hidden="true" className="size-4.5 text-primary" />
            {t("admin.activeChats")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("adminui.payout.openSub")}</p>
        </div>
        <DataTable
          rows={refundable}
          columns={openColumns}
          rowKey={(c) => c.id}
          caption={t("admin.activeChats")}
          empty={<EmptyState icon={Undo2} title={t("adminui.payout.noOpen")} />}
        />
      </section>
    </div>
  );
}

export default async function AdminPayoutsPage() {
  const t = await getT();
  return (
    <SuspenseReveal
      fallback={
        <AdminListSkeleton label={t("loading.label")} search={false} filters={false} stats={3} rows={4} />
      }
    >
      <Payouts />
    </SuspenseReveal>
  );
}
