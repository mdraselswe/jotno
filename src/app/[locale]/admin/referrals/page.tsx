import { Coins, Eye, Gift, ShieldAlert, Trophy, UserPlus } from "lucide-react";
import type { Route } from "next";
import {
  DataTable,
  EmptyState,
  FilterPills,
  PageHeader,
  SectionCard,
  StatCard,
  StatGrid,
  StatusBadge,
  type Column,
} from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { AdminListSkeleton } from "@/features/admin";
import { adminMetadata } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { InviteStatusButton, levelFor, LevelBadge } from "@/features/referrals";
import { inviteOverview, type InviteLeader, type InviteRow } from "@/features/referrals/server";
import type { MessageKey } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export async function generateMetadata() {
  return adminMetadata("grow.admin.title");
}

const FLAG: Record<string, MessageKey> = {
  same_device: "grow.flag.sameDevice",
  device_reused: "grow.flag.deviceReused",
  disposable_email: "grow.flag.disposable",
  admin: "grow.flag.admin",
};

async function Referrals({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const [locale, t, fmt, sp] = await Promise.all([getLocale(), getT(), getFormatter(), searchParams]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminReferrals));
  const filter = sp.show === "flagged" ? "flagged" : "all";
  const data = await inviteOverview(filter);
  const base = localeHref(locale, ROUTES.adminReferrals);

  const person = (name: string | null, email: string | null) => (
    <span className="grid min-w-0">
      <span className="truncate font-medium">{name ?? "—"}</span>
      {email ? <span className="truncate text-xs text-muted-foreground">{email}</span> : null}
    </span>
  );

  const leaderCols: Column<InviteLeader>[] = [
    {
      key: "who",
      header: t("grow.admin.inviter"),
      mobile: "title",
      cell: (l) => (
        <span className="flex items-center gap-2">
          {person(l.name, l.email)}
          <LevelBadge level={levelFor(l.paid, business.referral)} t={t} />
        </span>
      ),
    },
    { key: "role", header: t("grow.admin.role"), cell: (l) => t(`manage.role.${l.role}` as const) },
    {
      key: "joined",
      header: t("grow.joined"),
      className: "text-end tabular-nums",
      cell: (l) => fmt.number(l.joined),
    },
    {
      key: "paid",
      header: t("grow.paid"),
      className: "text-end tabular-nums",
      cell: (l) => fmt.number(l.paid),
    },
    {
      key: "flagged",
      header: t("grow.admin.flagged"),
      className: "text-end tabular-nums",
      cell: (l) => fmt.number(l.flagged),
    },
    {
      key: "today",
      header: t("grow.admin.today"),
      className: "text-end tabular-nums",
      cell: (l) => fmt.number(l.today),
    },
  ];

  const rowCols: Column<InviteRow>[] = [
    {
      key: "invited",
      header: t("grow.admin.invited"),
      mobile: "title",
      cell: (r) => person(r.invitedName, r.invitedEmail),
    },
    { key: "by", header: t("grow.admin.inviter"), cell: (r) => person(r.inviterName, r.inviterEmail) },
    {
      key: "when",
      header: t("grow.admin.when"),
      cell: (r) => (
        <time dateTime={r.createdAt.toISOString()} className="whitespace-nowrap">
          {fmt.dateTime(r.createdAt)}
        </time>
      ),
    },
    {
      key: "state",
      header: t("grow.admin.state"),
      cell: (r) =>
        r.status === "flagged" ? (
          <span className="grid gap-1">
            <StatusBadge tone="danger">{t("grow.admin.flagged")}</StatusBadge>
            {r.flagReason ? (
              <span className="text-xs text-muted-foreground">
                {FLAG[r.flagReason] ? t(FLAG[r.flagReason] as MessageKey) : r.flagReason}
              </span>
            ) : null}
          </span>
        ) : r.firstPaidAt ? (
          <StatusBadge tone="success">{t("grow.admin.paidState")}</StatusBadge>
        ) : r.activatedAt ? (
          <StatusBadge tone="info">{t("grow.admin.activeState")}</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">{t("grow.admin.joinedState")}</StatusBadge>
        ),
    },
    {
      key: "act",
      header: <span className="sr-only">{t("common.actions")}</span>,
      className: "text-end",
      cell: (r) => <InviteStatusButton refereeId={r.refereeId} flagged={r.status === "flagged"} />,
    },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title={t("grow.admin.title")} sub={t("grow.admin.sub")} icon={Gift} />
      <StatGrid>
        <StatCard label={t("grow.joined")} value={fmt.number(data.totals.joined)} icon={UserPlus} />
        <StatCard label={t("grow.paid")} value={fmt.number(data.totals.paid)} icon={Trophy} tone="primary" />
        <StatCard
          label={t("grow.admin.flagged")}
          value={fmt.number(data.totals.flagged)}
          icon={ShieldAlert}
          tone={data.totals.flagged > 0 ? "warning" : "default"}
        />
        <StatCard
          label={t("grow.admin.pointsOut")}
          value={fmt.number(data.totals.points)}
          hint={t("grow.pointsValue")}
          icon={Coins}
        />
      </StatGrid>

      {data.watch.length > 0 ? (
        <SectionCard
          title={t("grow.admin.watch")}
          description={t("grow.admin.watchSub", { n: business.referral.watchPerDay })}
          icon={Eye}
          className="ring-warning/40"
          bodyClassName="p-0 sm:p-0"
        >
          <DataTable
            rows={data.watch}
            columns={leaderCols}
            rowKey={(l) => l.userId}
            caption={t("grow.admin.watch")}
          />
        </SectionCard>
      ) : null}

      <section className="grid gap-3" aria-labelledby="ref-leaders">
        <h2 id="ref-leaders" className="font-heading text-lg font-semibold">
          {t("grow.admin.leaders")}
        </h2>
        <DataTable
          rows={data.leaders}
          columns={leaderCols}
          rowKey={(l) => l.userId}
          caption={t("grow.admin.leaders")}
          empty={<EmptyState icon={Trophy} title={t("grow.admin.empty")} />}
        />
      </section>

      <section className="grid gap-3" aria-labelledby="ref-recent">
        <h2 id="ref-recent" className="font-heading text-lg font-semibold">
          {t("grow.admin.recent")}
        </h2>
        <FilterPills
          label={t("grow.admin.recent")}
          items={[
            { href: base, label: t("grow.admin.all"), active: filter === "all" },
            {
              href: `${base}/?show=flagged` as Route,
              label: t("grow.admin.flagged"),
              active: filter === "flagged",
              count: data.totals.flagged,
            },
          ]}
        />
        <DataTable
          rows={data.recent}
          columns={rowCols}
          rowKey={(r) => r.refereeId}
          caption={t("grow.admin.recent")}
          empty={<EmptyState icon={UserPlus} title={t("grow.admin.empty")} />}
        />
      </section>
    </div>
  );
}

export default async function AdminReferralsPage({ searchParams }: PageProps<"/[locale]/admin/referrals">) {
  const t = await getT();
  return (
    <SuspenseReveal
      fallback={<AdminListSkeleton label={t("loading.label")} search={false} filters rows={6} />}
    >
      <Referrals searchParams={searchParams as Promise<{ show?: string }>} />
    </SuspenseReveal>
  );
}
