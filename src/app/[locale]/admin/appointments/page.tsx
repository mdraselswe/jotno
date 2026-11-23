import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/routes";
import { CancelAppointmentButton, FilterChips } from "@/features/admin";
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
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("manage.appointments")} sub={t("manage.appointmentsSub")} />
      <FilterChips
        label={t("manage.status")}
        items={FILTERS.map((f) => ({
          href: f === "upcoming" ? base : `${base}/?show=${f}`,
          label: t(`manage.visits.${f}`),
          active: f === show,
        }))}
      />
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.empty")}</p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-(--control-radius) bg-card px-4 py-3 shadow-(--shadow-card)"
            >
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {fmt.dateTime(a.startsAt)}
                  <Badge variant={a.status === "confirmed" ? "default" : "secondary"}>
                    {t(`manage.visit.${a.status}`)}
                  </Badge>
                </span>
                <span className="text-sm">
                  {a.vet} · {a.owner ?? a.ownerEmail ?? "—"}
                  {a.ownerPhone ? ` · ${a.ownerPhone}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("manage.fees", { booking: taka(fmt, a.bookingFee), visit: taka(fmt, a.visitFee) })}
                  {a.reason ? ` · ${a.reason}` : ""}
                </span>
              </span>
              {a.status === "confirmed" || a.status === "pending_payment" ? (
                <CancelAppointmentButton id={a.id} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminAppointmentsPage({ searchParams }: PageProps<"/[locale]/admin/appointments">) {
  return (
    <Private rows={6}>
      <Appointments searchParams={searchParams} />
    </Private>
  );
}
