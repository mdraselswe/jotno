import {
  BadgeCheck,
  Banknote,
  ChevronRight,
  CircleCheck,
  Clock,
  Flag,
  Gauge,
  HandCoins,
  MessageCircleQuestion,
  MessagesSquare,
  PackageCheck,
  PhoneMissed,
  PiggyBank,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Undo2,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { PageHeader, StatCard, StatGrid, type Tone } from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ROUTES } from "@/config/routes";
import { AdminOverviewSkeleton, listHref } from "@/features/admin";
import { adminCounts, consultAlerts } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { platformSummary } from "@/features/payments/server";
import type { MessageKey } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Admin", robots: { index: false } };

interface Tile {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  href?: Route;
  tone?: Tone;
}

function Group({ title, tiles }: { title: string; tiles: Tile[] }) {
  return (
    <section className="grid gap-3" aria-label={title}>
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <StatGrid>
        {tiles.map((tile) => (
          <StatCard key={tile.label} {...tile} />
        ))}
      </StatGrid>
    </section>
  );
}

async function Overview() {
  const [locale, t, fmt] = await Promise.all([getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.admin));
  const [c, money, consults] = await Promise.all([adminCounts(), platformSummary(), consultAlerts()]);
  const to = (route: string, params: Record<string, string> = {}) =>
    listHref(localeHref(locale, route), params) as Route;
  const n = (v: number) => fmt.number(v);

  // Things that wait on the team, most urgent first; only the ones that need someone show.
  const attention: (Tile & { count: number })[] = [
    {
      count: consults.reports,
      label: t("monitor.alert.reports"),
      value: n(consults.reports),
      hint: t("adminui.home.reportsHint"),
      icon: ShieldAlert,
      href: to(ROUTES.adminConsults, { show: "reported" }),
      tone: "danger" as const,
    },
    {
      count: c.refundsDue,
      label: t("adminui.home.refundsDue"),
      value: n(c.refundsDue),
      hint: t("adminui.home.refundsDueHint"),
      icon: Undo2,
      href: to(ROUTES.adminPayments),
      tone: "danger" as const,
    },
    {
      count: c.openReports,
      label: t("admin.openReports"),
      value: n(c.openReports),
      hint: t("adminui.home.openReportsHint"),
      icon: Flag,
      href: to(ROUTES.adminReports),
      tone: "danger" as const,
    },
    {
      count: c.paymentsReview,
      label: t("adminui.home.paymentsReview"),
      value: n(c.paymentsReview),
      hint: t("adminui.home.paymentsReviewHint"),
      icon: ReceiptText,
      href: to(ROUTES.adminPayments),
      tone: "warning" as const,
    },
    {
      count: c.pending,
      label: t("admin.pendingVets"),
      value: n(c.pending),
      hint: t("adminui.home.pendingVetsHint"),
      icon: UserCheck,
      href: to(ROUTES.adminVets, { status: "pending" }),
      tone: "warning" as const,
    },
    {
      count: consults.late7,
      label: t("monitor.alert.late"),
      value: n(consults.late7),
      hint: t("adminui.home.lateHint"),
      icon: Clock,
      href: to(ROUTES.adminConsults, { show: "late" }),
      tone: "warning" as const,
    },
    {
      count: c.paidOrders,
      label: t("admin.paidOrders"),
      value: n(c.paidOrders),
      hint: t("adminui.home.ordersHint"),
      icon: PackageCheck,
      href: to(ROUTES.adminShop, { status: "paid" }),
      tone: "warning" as const,
    },
  ].filter((a) => a.count > 0);

  const people: Tile[] = [
    { label: t("admin.users"), value: n(c.users), icon: Users, href: to(ROUTES.adminUsers) },
    {
      label: t("adminui.home.owners"),
      value: n(c.owners),
      icon: Users,
      href: to(ROUTES.adminUsers, { role: "owner" }),
    },
    {
      label: t("admin.verifiedVets"),
      value: n(c.verified),
      icon: BadgeCheck,
      href: to(ROUTES.adminVets, { status: "verified" }),
      tone: "success",
    },
    { label: t("admin.openQuestions"), value: n(c.openQuestions), icon: MessageCircleQuestion },
  ];
  const care: Tile[] = [
    {
      label: t("admin.activeConsults"),
      value: n(c.activeConsults),
      icon: MessagesSquare,
      href: to(ROUTES.adminConsults, { show: "active" }),
      tone: "primary",
    },
    {
      label: t("admin.consults30"),
      value: n(c.consults30),
      icon: Stethoscope,
      href: to(ROUTES.adminConsults),
    },
    {
      label: t("admin.refunded30"),
      value: n(c.refunded30),
      icon: Undo2,
      href: to(ROUTES.adminConsults, { show: "refunded" }),
    },
    {
      label: t("monitor.alert.calls"),
      value: n(consults.noAnswerCalls7),
      icon: PhoneMissed,
      href: to(ROUTES.adminConsults, { show: "calls" }),
    },
  ];
  const cash: Tile[] = [
    { label: t("admin.charges30"), value: taka(fmt, money.charges30), icon: Banknote },
    {
      label: t("admin.income30"),
      value: taka(fmt, money.income30),
      icon: PiggyBank,
      tone: "success",
      hint: t("adminui.home.incomeAll", { amount: taka(fmt, money.incomeAll) }),
    },
    { label: t("adminui.home.refunds30"), value: taka(fmt, Math.abs(money.refunds30)), icon: Undo2 },
    {
      label: t("admin.owed"),
      value: taka(fmt, money.owed),
      icon: HandCoins,
      href: to(ROUTES.adminPayouts),
      hint: t("adminui.home.owedHint"),
    },
  ];

  const tasks: { href: Route; icon: LucideIcon; title: MessageKey; body: MessageKey }[] = [
    {
      href: to(ROUTES.adminVets, { status: "pending" }),
      icon: UserCheck,
      title: "adminui.task.verify",
      body: "adminui.task.verifySub",
    },
    {
      href: to(ROUTES.adminPayments),
      icon: Wallet,
      title: "adminui.task.payments",
      body: "adminui.task.paymentsSub",
    },
    {
      href: to(ROUTES.adminPayouts),
      icon: HandCoins,
      title: "adminui.task.payouts",
      body: "adminui.task.payoutsSub",
    },
    {
      href: to(ROUTES.adminUsers),
      icon: Users,
      title: "adminui.task.findPerson",
      body: "adminui.task.findPersonSub",
    },
    {
      href: to(ROUTES.adminFeatured),
      icon: Sparkles,
      title: "adminui.task.feature",
      body: "adminui.task.featureSub",
    },
    {
      href: to(ROUTES.adminSettings),
      icon: Settings,
      title: "adminui.task.settings",
      body: "adminui.task.settingsSub",
    },
    {
      href: to(ROUTES.adminAudit),
      icon: ScrollText,
      title: "adminui.task.audit",
      body: "adminui.task.auditSub",
    },
  ];

  return (
    <div className="grid gap-8">
      <PageHeader title={t("admin.title")} sub={t("admin.sub")} icon={Gauge} />

      <section className="grid gap-3" aria-labelledby="attention-title">
        <h2 id="attention-title" className="font-heading text-lg font-semibold">
          {t("adminui.home.attention")}
        </h2>
        {attention.length > 0 ? (
          <StatGrid>
            {attention.map((a) => (
              <StatCard
                key={a.label}
                label={a.label}
                value={a.value}
                hint={a.hint}
                icon={a.icon}
                href={a.href}
                tone={a.tone}
              />
            ))}
          </StatGrid>
        ) : (
          <p className="flex items-center gap-3 rounded-(--radius-2xl) bg-success/10 p-4 text-sm font-medium ring-1 ring-success/25 sm:p-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
              <CircleCheck aria-hidden="true" className="size-5" />
            </span>
            {t("adminui.home.allClear")}
          </p>
        )}
      </section>

      <Group title={t("adminui.home.people")} tiles={people} />
      <Group title={t("adminui.home.care")} tiles={care} />
      <Group title={t("adminui.home.money")} tiles={cash} />

      <section className="grid gap-3" aria-labelledby="tasks-title">
        <h2 id="tasks-title" className="font-heading text-lg font-semibold">
          {t("adminui.home.tasks")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tasks.map(({ href, icon: Icon, title, body }) => (
            <li key={title}>
              <Link
                href={href}
                className="group flex h-full items-center gap-3.5 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 transition-[box-shadow,translate] duration-(--motion-base) ease-(--ease-ui) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="font-semibold">{t(title)}</span>
                  <span className="text-xs text-pretty text-muted-foreground">{t(body)}</span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-fast) group-hover:translate-x-0.5 rtl:rotate-180"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default async function AdminPage() {
  const t = await getT();
  return (
    <SuspenseReveal fallback={<AdminOverviewSkeleton label={t("loading.label")} />}>
      <Overview />
    </SuspenseReveal>
  );
}
