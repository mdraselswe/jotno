import { CalendarDays } from "lucide-react";
import type { Route } from "next";
import {
  DataTable,
  EmptyState,
  FilterPills,
  PageHeader,
  StatusBadge,
  type Column,
} from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ROUTES } from "@/config/routes";
import { AdminListSkeleton, appointmentTone, CancelAppointmentButton, listHref } from "@/features/admin";
import { listAppointments, type AppointmentFilter } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Admin · Visits", robots: { index: false } };

const FILTERS: AppointmentFilter[] = ["upcoming", "past", "cancelled", "all"];
type SP = Record<string, string | string[] | undefined>;

async function Appointments({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, locale, t, fmt] = await Promise.all([searchParams, getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminAppointments));
  const raw = Array.isArray(sp.show) ? sp.show[0] : sp.show;
  const show = (FILTERS as string[]).includes(raw ?? "") ? (raw as AppointmentFilter) : "upcoming";
  const rows = await listAppointments(show);
  const base = localeHref(locale, ROUTES.adminAppointments);

  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    {
      key: "when",
      header: t("admin.when"),
      mobile: "title",
      className: "whitespace-nowrap",
      cell: (a) => (
        <time dateTime={a.startsAt.toISOString()} className="font-semibold">
          {fmt.dateTime(a.startsAt)}
        </time>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (a) => (
        <StatusBadge tone={appointmentTone(a.status)}>{t(`manage.visit.${a.status}`)}</StatusBadge>
      ),
    },
    { key: "vet", header: t("admin.vet"), cell: (a) => a.vet },
    {
      key: "owner",
      header: t("monitor.owner"),
      cell: (a) => (
        <span className="grid min-w-0">
          <span className="truncate">{a.owner ?? a.ownerEmail ?? "—"}</span>
          {a.ownerPhone ? (
            <a href={`tel:${a.ownerPhone}`} className="text-xs text-primary tabular-nums hover:underline">
              {a.ownerPhone}
            </a>
          ) : null}
        </span>
      ),
    },
    {
      key: "fees",
      header: t("adminui.visits.fees"),
      className: "whitespace-nowrap tabular-nums",
      cell: (a) => (
        <span className="grid text-end md:text-start">
          <span>{t("adminui.visits.booking", { amount: taka(fmt, a.bookingFee) })}</span>
          <span className="text-xs text-muted-foreground">
            {t("adminui.visits.visit", { amount: taka(fmt, a.visitFee) })}
          </span>
        </span>
      ),
    },
    {
      key: "reason",
      header: t("adminui.visits.reason"),
      className: "max-w-56",
      cell: (a) => <span className="line-clamp-2 text-pretty">{a.reason ?? "—"}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">{t("common.actions")}</span>,
      className: "text-end",
      cell: (a) =>
        a.status === "confirmed" || a.status === "pending_payment" ? (
          <CancelAppointmentButton id={a.id} when={fmt.dateTime(a.startsAt)} />
        ) : null,
    },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title={t("manage.appointments")} sub={t("manage.appointmentsSub")} icon={CalendarDays} />
      <FilterPills
        label={t("common.status")}
        items={FILTERS.map((f) => ({
          href: listHref(base, { show: f }, { show: "upcoming" }) as Route,
          label: t(`manage.visits.${f}`),
          active: f === show,
        }))}
      />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(a) => a.id}
        caption={t("manage.appointments")}
        empty={
          <EmptyState
            icon={CalendarDays}
            title={t(`adminui.visits.empty.${show}`)}
            body={show === "upcoming" ? t("adminui.visits.emptyBody") : undefined}
          />
        }
      />
      {rows.length === 200 ? <p className="text-sm text-muted-foreground">{t("adminui.first200")}</p> : null}
    </div>
  );
}

export default async function AdminAppointmentsPage({
  searchParams,
}: PageProps<"/[locale]/admin/appointments">) {
  const t = await getT();
  return (
    <SuspenseReveal fallback={<AdminListSkeleton label={t("loading.label")} search={false} rows={6} />}>
      <Appointments searchParams={searchParams} />
    </SuspenseReveal>
  );
}
