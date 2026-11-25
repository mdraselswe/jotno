import { CalendarCheck, CalendarClock, CalendarX2, History, Info } from "lucide-react";
import type { Route } from "next";
import { EmptyState, FilterPills, PageHeader } from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { VetAppointmentActions, VetVisitCard, VetVisitCardSkeleton } from "@/features/appointments";
import { getHours, listVetAppointments } from "@/features/appointments/server";
import { requireVet } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { dhakaDay } from "@/lib/dhaka";
import { localeHref } from "@/lib/locale-href";
import { isPast } from "@/lib/time";

export const metadata = { title: "Appointments", robots: { index: false } };

const SHOWS = ["today", "upcoming", "past"] as const;
type Show = (typeof SHOWS)[number];
type SP = Record<string, string | string[] | undefined>;

/** Read once per request (outside the component body, see lib/time.ts). */
const requestToday = () => dhakaDay(new Date());

async function Appointments({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, locale, t, fmt] = await Promise.all([searchParams, getLocale(), getT(), getFormatter()]);
  const { provider } = await requireVet(locale, localeHref(locale, ROUTES.vetAppointments));
  const [upcoming, past, hours] = await Promise.all([
    listVetAppointments(provider.id, true),
    listVetAppointments(provider.id, false),
    getHours(provider.id),
  ]);

  const today = requestToday();
  const isToday = (d: Date) => dhakaDay(d) === today;
  const lists: Record<Show, typeof upcoming> = {
    // Today: earlier visits not yet marked, then the ones still to come.
    today: [
      ...past.filter((a) => isToday(a.startsAt)).reverse(),
      ...upcoming.filter((a) => isToday(a.startsAt)),
    ],
    upcoming: upcoming.filter((a) => !isToday(a.startsAt)),
    past: past.filter((a) => !isToday(a.startsAt)),
  };
  const raw = Array.isArray(sp.show) ? sp.show[0] : sp.show;
  const show: Show = (SHOWS as readonly string[]).includes(raw ?? "")
    ? (raw as Show)
    : lists.today.length > 0 || lists.upcoming.length === 0
      ? "today"
      : "upcoming";
  const rows = lists[show];
  const base = localeHref(locale, ROUTES.vetAppointments);

  const empty = {
    today: {
      icon: CalendarCheck,
      title: t("vetui.appt.emptyToday"),
      body: hours.length === 0 ? t("appt.noHours") : t("vetui.today.emptyBody"),
    },
    upcoming: {
      icon: CalendarClock,
      title: t("vetui.appt.emptyUpcoming"),
      body: t("vetui.appt.emptyUpcomingBody"),
    },
    past: { icon: History, title: t("vetui.appt.emptyPast"), body: t("vetui.appt.emptyPastBody") },
  }[show];

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={CalendarCheck}
        title={t("appt.vetTitle")}
        sub={t("vetui.appt.sub")}
        actions={
          <ButtonLink
            href={localeHref(locale, ROUTES.vetSchedule)}
            variant="outline"
            className="max-sm:flex-1"
          >
            <CalendarClock aria-hidden="true" />
            {t("appt.scheduleTitle")}
          </ButtonLink>
        }
      />

      {hours.length === 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-(--radius-xl) bg-info/10 p-3 text-sm ring-1 ring-info/25 sm:px-4">
          <Info aria-hidden="true" className="size-5 shrink-0 text-info" />
          <p className="min-w-0 flex-1 basis-48 text-pretty">{t("appt.noHours")}</p>
          <ButtonLink href={localeHref(locale, ROUTES.vetSchedule)} variant="brand" size="sm">
            {t("vetui.today.setHours")}
          </ButtonLink>
        </div>
      ) : null}

      <FilterPills
        label={t("vetui.appt.filter")}
        items={SHOWS.map((s) => ({
          href: `${base}/?show=${s}` as Route,
          label: t(`vetui.appt.${s}`),
          active: s === show,
          count: lists[s].length,
        }))}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={show === "past" ? History : hours.length === 0 ? CalendarX2 : empty.icon}
          title={empty.title}
          body={empty.body}
          action={
            show !== "past" ? (
              <ButtonLink
                href={localeHref(locale, ROUTES.vetSchedule)}
                variant={hours.length === 0 ? "brand" : "outline"}
                size="sm"
              >
                <CalendarClock aria-hidden="true" />
                {t("vetui.today.setHours")}
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-2.5" aria-label={t(`vetui.appt.${show}`)}>
          {rows.map((a) => (
            <li key={a.id}>
              <VetVisitCard
                visit={a}
                t={t}
                fmt={fmt}
                compact={show === "today"}
                actions={
                  a.status === "confirmed" ? (
                    <VetAppointmentActions id={a.id} past={isPast(a.startsAt)} />
                  ) : null
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AppointmentsSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-2.5">
        {Array.from({ length: 4 }, (_, i) => (
          <VetVisitCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function VetAppointmentsPage({ searchParams }: PageProps<"/[locale]/dashboard/appointments">) {
  return (
    <SuspenseReveal fallback={<AppointmentsSkeleton />}>
      <Appointments searchParams={searchParams} />
    </SuspenseReveal>
  );
}
