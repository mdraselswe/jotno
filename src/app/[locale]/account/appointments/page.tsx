import { AppointmentList } from "@/components/layout/appointment-list";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ButtonLink } from "@/components/ui/button-link";
import { ROUTES } from "@/config/routes";
import { CancelAppointmentButton } from "@/features/appointments";
import { listOwnerAppointments } from "@/features/appointments/server";
import { requireViewer } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { isPast } from "@/lib/time";
import { taka } from "@/lib/money";

export const metadata = { title: "Appointments", robots: { index: false } };

async function Appointments() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, ROUTES.appointments));
  const items = await listOwnerAppointments(viewer.id);
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("account.appointments")} sub={t("appt.ownerSub")} />
      {items.length === 0 ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-muted-foreground">{t("appt.empty")}</p>
          <ButtonLink href={localeHref(locale, ROUTES.vets)}>{t("account.quickFind")}</ButtonLink>
        </div>
      ) : (
        <AppointmentList
          rows={items.map((a) => ({
            id: a.id,
            startsAt: a.startsAt,
            status: a.status,
            reason: a.reason,
            title: a.vetName,
            detail: [a.clinic, a.address, a.phone, `${t("appt.visitFee")}: ${taka(fmt, a.visitFee)}`]
              .filter(Boolean)
              .join(" · "),
          }))}
          t={t}
          fmt={fmt}
          action={(r) =>
            r.status === "confirmed" && !isPast(r.startsAt) ? <CancelAppointmentButton id={r.id} /> : null
          }
        />
      )}
    </div>
  );
}

export default function OwnerAppointmentsPage() {
  return (
    <Private>
      <Appointments />
    </Private>
  );
}
