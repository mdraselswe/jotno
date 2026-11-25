import { CalendarDays, CalendarPlus, History, MapPin, PawPrint, Phone, Wallet } from "lucide-react";
import { Suspense } from "react";
import { EmptyState, PageHeader } from "@/components/layout/app-ui";
import {
  AppointmentList,
  AppointmentListSkeleton,
  type AppointmentRow,
} from "@/components/layout/appointment-list";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { CancelAppointmentButton } from "@/features/appointments";
import { listOwnerAppointments, type AppointmentItem } from "@/features/appointments/server";
import { requireViewer } from "@/features/auth/server";
import type { Translate, Formatter } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { isPast } from "@/lib/time";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("account.appointments"), robots: { index: false } };
}

function toRow(a: AppointmentItem, t: Translate, fmt: Formatter, upcoming: boolean): AppointmentRow {
  const meta: NonNullable<AppointmentRow["meta"]> = [];
  const place = [a.clinic, a.address].filter(Boolean).join(", ");
  if (place) meta.push({ icon: MapPin, text: place });
  if (a.petName) meta.push({ icon: PawPrint, text: t("ownerui.appt.forPet", { name: a.petName }) });
  if (upcoming && a.phone) meta.push({ icon: Phone, text: a.phone, href: `tel:${a.phone}` });
  if (upcoming) meta.push({ icon: Wallet, text: t("ownerui.appt.visitFee", { fee: taka(fmt, a.visitFee) }) });
  return {
    id: a.id,
    startsAt: a.startsAt,
    status: a.status,
    reason: a.reason,
    title: a.vetName,
    detail: null,
    meta,
  };
}

async function Appointments() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, ROUTES.appointments));
  const items = await listOwnerAppointments(viewer.id);
  const upcoming = items
    .filter((a) => a.status === "confirmed" && !isPast(a.startsAt))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = items.filter((a) => !upcoming.includes(a));
  const find = (
    <ButtonLink href={localeHref(locale, ROUTES.vets)} variant="brand" className="max-sm:w-full">
      <CalendarPlus aria-hidden="true" />
      {t("ownerui.appt.book")}
    </ButtonLink>
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("account.appointments")}
        sub={t("appt.ownerSub")}
        icon={CalendarDays}
        actions={items.length > 0 ? find : undefined}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={t("ownerui.appt.emptyTitle")}
          body={t("ownerui.appt.emptyBody")}
          action={find}
        />
      ) : (
        <>
          <section aria-labelledby="up-h" className="grid gap-3">
            <h2 id="up-h" className="flex items-center gap-2 font-heading text-lg font-semibold">
              {t("ownerui.appt.upcoming")}
              <span className="rounded-full bg-primary/10 px-2 text-sm text-primary tabular-nums">
                {fmt.number(upcoming.length)}
              </span>
            </h2>
            {upcoming.length === 0 ? (
              <p className="rounded-(--radius-2xl) bg-card px-4 py-5 text-sm text-muted-foreground shadow-(--shadow-card) ring-1 ring-foreground/6">
                {t("ownerui.appt.noUpcoming")}
              </p>
            ) : (
              <AppointmentList
                rows={upcoming.map((a) => toRow(a, t, fmt, true))}
                t={t}
                fmt={fmt}
                action={(r) => <CancelAppointmentButton id={r.id} />}
              />
            )}
          </section>
          {past.length > 0 ? (
            <section aria-labelledby="past-h" className="grid gap-3">
              <h2
                id="past-h"
                className="flex items-center gap-2 font-heading text-lg font-semibold text-muted-foreground"
              >
                <History aria-hidden="true" className="size-4.5" />
                {t("appt.past")}
              </h2>
              <AppointmentList rows={past.map((a) => toRow(a, t, fmt, false))} t={t} fmt={fmt} />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function AppointmentsSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <Skeleton className="h-6 w-28" />
      <AppointmentListSkeleton />
    </div>
  );
}

export default function OwnerAppointmentsPage() {
  return (
    <Suspense fallback={<AppointmentsSkeleton />}>
      <Appointments />
    </Suspense>
  );
}
