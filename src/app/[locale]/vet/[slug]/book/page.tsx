import { ArrowLeft, BadgeCheck, CalendarX, LogIn, MapPin, MessageCircle, Star } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Spot } from "@/components/illustrations/spots";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { bookPath, consultStartPath, ROUTES, vetPath } from "@/config/routes";
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
  const area = locale === "bn" ? (vet.areaBn ?? vet.districtBn) : (vet.areaEn ?? vet.districtEn);
  const place = [vet.clinicName, vet.address ?? area].filter(Boolean).join(", ");
  const bookingFee = taka(fmt, business.appointment.bookingFee);
  const visitFee = taka(fmt, vet.visitFee);

  return (
    <div className="grid gap-5">
      <Link
        href={localeHref(locale, vetPath(slug))}
        className="inline-flex w-fit items-center gap-1.5 rounded-(--radius-md) text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {vet.displayName}
      </Link>

      {/* Vet summary */}
      <header className="grid gap-4 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5">
        <div className="flex items-center gap-4">
          <VetPhoto vet={vet} className="size-16 sm:size-18" />
          <div className="grid min-w-0 flex-1 gap-1">
            <h1 className="font-heading text-xl leading-tight font-bold tracking-tight text-balance sm:text-2xl">
              {t("appt.bookTitle", { name: vet.displayName })}
            </h1>
            {vet.title ? <p className="truncate text-sm text-muted-foreground">{vet.title}</p> : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {vet.rating != null && vet.ratingCount > 0 ? (
                <span className="inline-flex items-center gap-1 font-medium">
                  <Star aria-hidden="true" className="size-4 fill-highlight text-highlight" />
                  {t("ownerui.book.rating", {
                    r: fmt.number(vet.rating, { maximumFractionDigits: 1 }),
                    n: fmt.number(vet.ratingCount),
                  })}
                </span>
              ) : null}
              {vet.verifiedAt ? (
                <span className="inline-flex items-center gap-1 text-primary">
                  <BadgeCheck aria-hidden="true" className="size-4" />
                  {t("common.verified")}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {place ? (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 break-words">{place}</span>
          </p>
        ) : null}
        <dl className="grid grid-cols-2 gap-2">
          <div className="grid gap-0.5 rounded-(--radius-lg) bg-primary/8 px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{t("appt.bookingFee")}</dt>
            <dd className="font-heading text-lg font-bold tabular-nums">{bookingFee}</dd>
          </div>
          <div className="grid gap-0.5 rounded-(--radius-lg) bg-muted/60 px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{t("appt.visitFee")}</dt>
            <dd className="font-heading text-lg font-bold tabular-nums">{visitFee}</dd>
          </div>
        </dl>
        <p className="text-xs text-pretty text-muted-foreground">{t("appt.feeNote")}</p>
      </header>

      {days.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-(--radius-2xl) border-2 border-dashed border-foreground/15 bg-card/50 px-6 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
            <CalendarX aria-hidden="true" className="size-6" />
          </span>
          <p className="max-w-sm text-pretty">{t("appt.noSlots")}</p>
          <ButtonLink href={localeHref(locale, consultStartPath(slug))} variant="brand">
            <MessageCircle aria-hidden="true" />
            {t("vets.chatNow")}
          </ButtonLink>
        </div>
      ) : viewer ? (
        <SlotPicker
          providerId={vet.id}
          days={days}
          pets={pets.map((p) => ({ id: p.id, name: p.name }))}
          feeLabel={bookingFee}
          visitFeeLabel={visitFee}
          place={place || undefined}
        />
      ) : (
        <div className="grid justify-items-center gap-3 rounded-(--radius-2xl) bg-card px-6 py-8 text-center shadow-(--shadow-card) ring-1 ring-foreground/6">
          <Spot name="welcome" className="w-28" />
          <p className="font-heading text-lg font-semibold">{t("ownerui.book.signInTitle")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("ownerui.book.signInBody")}</p>
          <ButtonLink
            href={`${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(here)}` as Route}
            variant="brand"
            size="lg"
          >
            <LogIn aria-hidden="true" className="rtl:rotate-180" />
            {t("nav.signIn")}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

function BookSkeleton() {
  return (
    <div role="status" className="grid gap-5">
      <Skeleton className="h-5 w-32" />
      <div className="grid gap-4 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full sm:size-18" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-16 rounded-(--radius-lg)" />
          <Skeleton className="h-16 rounded-(--radius-lg)" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="grid gap-5">
          <div className="flex gap-2 overflow-hidden rounded-(--radius-2xl) bg-card p-4 ring-1 ring-foreground/6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-24 w-18 shrink-0 rounded-(--radius-xl)" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-(--radius-2xl) bg-card p-4 ring-1 ring-foreground/6 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-11 rounded-(--control-radius)" />
            ))}
          </div>
        </div>
        <Skeleton className="h-72 rounded-(--radius-2xl) max-lg:hidden" />
      </div>
    </div>
  );
}

export default function BookPage({ params }: PageProps<"/[locale]/vet/[slug]/book">) {
  return (
    // container-page: the page used to sit edge to edge on phones (no side padding).
    <div className="container-page py-6 md:py-10">
      <Suspense fallback={<BookSkeleton />}>
        <Book params={params} />
      </Suspense>
    </div>
  );
}
