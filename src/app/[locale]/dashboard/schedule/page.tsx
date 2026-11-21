import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { HoursEditor, toHhmm } from "@/features/appointments";
import { getHours } from "@/features/appointments/server";
import { requireVet } from "@/features/providers/server";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Schedule", robots: { index: false } };

async function Schedule() {
  const locale = await getLocale();
  const t = await getT();
  const { provider } = await requireVet(locale, localeHref(locale, ROUTES.vetSchedule));
  const hours = await getHours(provider.id);
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("appt.scheduleTitle")} sub={t("appt.scheduleSub")} />
      <HoursEditor
        initial={hours.map((h) => ({
          weekday: h.weekday,
          start: toHhmm(h.startMinute),
          end: toHhmm(h.endMinute),
          slotMinutes: h.slotMinutes,
        }))}
      />
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Private rows={5}>
      <Schedule />
    </Private>
  );
}
