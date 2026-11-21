import { AppointmentList } from "@/components/layout/appointment-list";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ButtonLink } from "@/components/ui/button-link";
import { ROUTES } from "@/config/routes";
import { VetAppointmentActions } from "@/features/appointments";
import { getHours, listVetAppointments, type AppointmentItem } from "@/features/appointments/server";
import { requireVet } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { isPast } from "@/lib/time";

export const metadata = { title: "Appointments", robots: { index: false } };

const toRow = (a: AppointmentItem) => ({
  id: a.id,
  startsAt: a.startsAt,
  status: a.status,
  reason: a.reason,
  title: [a.ownerName, a.petName].filter(Boolean).join(" · ") || "—",
  detail: a.ownerPhone,
});

async function Appointments() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { provider } = await requireVet(locale, localeHref(locale, ROUTES.vetAppointments));
  const [upcoming, past, hours] = await Promise.all([
    listVetAppointments(provider.id, true),
    listVetAppointments(provider.id, false),
    getHours(provider.id),
  ]);
  return (
    <div className="grid gap-8">
      <PrivateHeading
        title={t("appt.vetTitle")}
        action={
          <ButtonLink href={localeHref(locale, ROUTES.vetSchedule)} variant="outline" size="sm">
            {t("appt.scheduleTitle")}
          </ButtonLink>
        }
      />
      {hours.length === 0 ? (
        <p className="rounded-(--control-radius) bg-info/10 px-3 py-2 text-sm">{t("appt.noHours")}</p>
      ) : null}
      <section className="grid gap-3">
        <h2 className="font-heading text-xl font-semibold">{t("appt.upcoming")}</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground">{t("appt.empty")}</p>
        ) : (
          <AppointmentList
            rows={upcoming.map(toRow)}
            t={t}
            fmt={fmt}
            action={(r) => <VetAppointmentActions id={r.id} past={isPast(r.startsAt)} />}
          />
        )}
      </section>
      {past.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="font-heading text-xl font-semibold">{t("appt.past")}</h2>
          <AppointmentList
            rows={past.map(toRow)}
            t={t}
            fmt={fmt}
            action={(r) => (r.status === "confirmed" ? <VetAppointmentActions id={r.id} past /> : null)}
          />
        </section>
      ) : null}
    </div>
  );
}

export default function VetAppointmentsPage() {
  return (
    <Private>
      <Appointments />
    </Private>
  );
}
