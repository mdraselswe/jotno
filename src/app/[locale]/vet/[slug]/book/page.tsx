import { CalendarX, MapPin } from "lucide-react";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { bookPath, consultStartPath, ROUTES } from "@/config/routes";
import { SlotPicker } from "@/features/appointments";
import { bookingDays } from "@/features/appointments/server";
import { getViewer } from "@/features/auth/server";
import { listPets } from "@/features/pets/server";
import { VetPhoto } from "@/features/providers";
import { getProviderBySlug } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { robots: { index: false } };

async function Book({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const vet = await getProviderBySlug(slug);
  if (!vet) notFound();
  const [viewer, days] = await Promise.all([getViewer(), bookingDays(vet.id)]);
  const pets = viewer ? await listPets(viewer.id) : [];
  const here = localeHref(locale, bookPath(slug));

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      <header className="flex items-center gap-4">
        <VetPhoto vet={vet} />
        <div className="grid gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("appt.bookTitle", { name: vet.displayName })}
          </h1>
          {vet.clinicName || vet.address ? (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin aria-hidden="true" className="size-4 shrink-0" />
              {[vet.clinicName, vet.address].filter(Boolean).join(", ")}
            </p>
          ) : null}
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 rounded-(--radius-xl) bg-muted/60 p-4 text-sm">
        <div>
          <dt className="text-muted-foreground">{t("appt.bookingFee")}</dt>
          <dd className="font-medium">{taka(fmt, business.appointment.bookingFee)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("appt.visitFee")}</dt>
          <dd className="font-medium">{taka(fmt, vet.visitFee)}</dd>
        </div>
        <p className="col-span-2 text-xs text-muted-foreground">{t("appt.feeNote")}</p>
      </dl>

      {days.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-(--radius-xl) bg-card p-6 text-center shadow-(--shadow-control)">
          <CalendarX aria-hidden="true" className="size-8 text-muted-foreground" />
          <p>{t("appt.noSlots")}</p>
          <ButtonLink href={localeHref(locale, consultStartPath(slug))}>{t("vets.startChat")}</ButtonLink>
        </div>
      ) : viewer ? (
        <SlotPicker
          providerId={vet.id}
          days={days}
          pets={pets.map((p) => ({ id: p.id, name: p.name }))}
          feeLabel={taka(fmt, business.appointment.bookingFee)}
        />
      ) : (
        <ButtonLink
          href={`${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(here)}` as Route}
          size="lg"
        >
          {t("consult.signIn")}
        </ButtonLink>
      )}
    </div>
  );
}

export default function BookPage({ params }: PageProps<"/[locale]/vet/[slug]/book">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid w-full max-w-xl gap-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      }
    >
      <Book params={params} />
    </Suspense>
  );
}
