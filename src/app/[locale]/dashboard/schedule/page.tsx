import { CalendarCheck, CalendarClock, CalendarRange, Clock3, Info } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { HoursEditor, toHhmm } from "@/features/appointments";
import { getHours } from "@/features/appointments/server";
import { requireVet } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("vet.schedule"), robots: { index: false } };
}

async function Schedule() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { provider } = await requireVet(locale, localeHref(locale, ROUTES.vetSchedule));
  const hours = await getHours(provider.id);
  const tips = [
    { icon: CalendarRange, text: t("vetui.sched.tip1", { n: fmt.number(business.appointment.daysAhead) }) },
    { icon: Clock3, text: t("vetui.sched.tip2", { n: fmt.number(business.appointment.leadMinutes) }) },
    { icon: Info, text: t("vetui.sched.tip3") },
  ];
  return (
    <div className="grid gap-6">
      <PageHeader
        icon={CalendarClock}
        title={t("appt.scheduleTitle")}
        sub={t("appt.scheduleSub")}
        actions={
          <ButtonLink
            href={localeHref(locale, ROUTES.vetAppointments)}
            variant="outline"
            className="max-sm:flex-1"
          >
            <CalendarCheck aria-hidden="true" />
            {t("vet.appointments")}
          </ButtonLink>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <HoursEditor
          initial={hours.map((h) => ({
            weekday: h.weekday,
            start: toHhmm(h.startMinute),
            end: toHhmm(h.endMinute),
            slotMinutes: h.slotMinutes,
          }))}
        />
        <aside className="xl:sticky xl:top-24">
          <SectionCard title={t("vetui.sched.tipsTitle")} icon={Info}>
            <ul className="grid gap-3 text-sm">
              {tips.map((tip) => (
                <li key={tip.text} className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-(--radius-md) bg-primary/10 text-primary">
                    <tip.icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="text-pretty text-muted-foreground">{tip.text}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <ul className="grid gap-3">
          {Array.from({ length: 7 }, (_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-(--radius-2xl) bg-card p-3 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-4"
            >
              <Skeleton className="h-[18px] w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ms-auto h-6 w-16 rounded-full" />
            </li>
          ))}
        </ul>
        <Skeleton className="h-48 rounded-(--radius-2xl) max-xl:hidden" />
      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <SuspenseReveal fallback={<ScheduleSkeleton />}>
      <Schedule />
    </SuspenseReveal>
  );
}
