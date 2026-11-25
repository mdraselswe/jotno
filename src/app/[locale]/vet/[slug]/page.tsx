import {
  ArrowLeft,
  CalendarDays,
  Clock,
  GraduationCap,
  Home,
  MapPin,
  MessageCircle,
  MessagesSquare,
  ShieldCheck,
  Siren,
  Star,
  Stethoscope,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { EmptyState, SectionCard, StatusBadge } from "@/components/layout/app-ui";
import { ButtonLink } from "@/components/ui/button-link";
import { JsonLd } from "@/components/ui/json-ld";
import { Skeleton } from "@/components/ui/skeleton";
import { business, site } from "@/config";
import { LOCALES, localePath } from "@/config/locale";
import { bookPath, consultStartPath, pageUrl, ROUTES, vetPath } from "@/config/routes";
import { getHours } from "@/features/appointments/server";
import { speciesNames, VetContactButtons, VetOfflineNotice, VetPhoto, vetPlace } from "@/features/providers";
import { getProviderBySlug, recordStat, type ProviderPublic } from "@/features/providers/server";
import type { Formatter, Translate } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { dhakaDay, dhakaWeekday } from "@/lib/dhaka";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/vet/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const vet = await getProviderBySlug(slug);
  if (!vet) return { title: "Vet", robots: { index: false } };
  const place = vetPlace(vet, locale);
  const description = [vet.title, place, vet.bio?.slice(0, 120)].filter(Boolean).join(" · ");
  const url = pageUrl(localePath(locale, vetPath(slug)));
  return {
    title: vet.displayName,
    description,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(LOCALES.map((l) => [l, pageUrl(localePath(l, vetPath(slug)))])),
    },
    openGraph: {
      title: vet.displayName,
      description,
      url,
      type: "profile",
      images: vet.photoUrl ? [vet.photoUrl] : undefined,
    },
    robots: vet.isDemo ? { index: false } : undefined,
  };
}

const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5]; // Saturday first, as Bangladesh weeks go
const DAY_KEYS = [
  "appt.sun",
  "appt.mon",
  "appt.tue",
  "appt.wed",
  "appt.thu",
  "appt.fri",
  "appt.sat",
] as const;

/** Minutes after Dhaka midnight → "5:00 PM" in the page language. */
const clock = (fmt: Formatter, minute: number) =>
  fmt.date(new Date(Date.UTC(2000, 0, 2, 0, minute)), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < Math.round(value) ? "fill-highlight text-highlight" : "text-muted-foreground/35",
          )}
        />
      ))}
    </span>
  );
}

async function OpeningHours({ vet, t, fmt }: { vet: ProviderPublic; t: Translate; fmt: Formatter }) {
  const hours = await getHours(vet.id);
  const today = dhakaWeekday(dhakaDay(new Date()));
  return (
    <SectionCard title={t("pubui.vet.hours")} description={t("pubui.vet.hoursNote")} icon={Clock}>
      <div className="grid gap-4">
        <p
          className={cn(
            "flex items-center gap-2 rounded-(--radius-lg) px-3 py-2.5 text-sm font-medium",
            vet.availableNow ? "bg-success/10 text-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              vet.availableNow ? "live-ping bg-success" : "bg-muted-foreground/50",
            )}
          />
          {vet.availableNow ? t("pubui.vet.onlineNow") : t("pubui.vet.offlineNow")}
        </p>
        {hours.length === 0 ? (
          <p className="text-sm text-pretty text-muted-foreground">{t("pubui.vet.noSchedule")}</p>
        ) : (
          <dl className="grid gap-1 text-sm">
            {WEEK_ORDER.map((day) => {
              const blocks = hours.filter((h) => h.weekday === day);
              const isToday = day === today;
              return (
                <div
                  key={day}
                  className={cn(
                    "flex items-baseline justify-between gap-3 rounded-(--radius-md) px-2 py-1.5",
                    isToday && "bg-primary/8 font-semibold",
                  )}
                >
                  <dt className="shrink-0">
                    {t(DAY_KEYS[day] ?? "appt.sun")}
                    {isToday ? <span className="sr-only"> ({t("common.today")})</span> : null}
                  </dt>
                  <dd className="text-end tabular-nums">
                    {blocks.length === 0 ? (
                      <span className="text-muted-foreground">{t("pubui.vet.closed")}</span>
                    ) : (
                      blocks.map((b) => (
                        <span key={b.startMinute} className="block">
                          {clock(fmt, b.startMinute)} – {clock(fmt, b.endMinute)}
                        </span>
                      ))
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </div>
    </SectionCard>
  );
}

function OpeningHoursSkeleton() {
  return <Skeleton className="h-80 rounded-(--radius-2xl)" />;
}

async function VetProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const vet = await getProviderBySlug(slug);
  if (!vet) notFound();
  after(() => recordStat(vet.id, "views"));

  const place = vetPlace(vet, locale);
  const animals = speciesNames(vet.species, locale);
  const chatHref = localeHref(locale, consultStartPath(vet.slug));
  const bookHref = localeHref(locale, bookPath(vet.slug));
  const chatLabel = t("vets.startChat", { fee: taka(fmt, vet.consultFee) });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VeterinaryCare",
    name: vet.clinicName ?? vet.displayName,
    url: `${site.url}${pageUrl(localePath(locale, vetPath(vet.slug)))}`,
    image: vet.photoUrl ?? undefined,
    telephone: vet.phonePublic ?? undefined,
    address: vet.address
      ? { "@type": "PostalAddress", streetAddress: vet.address, addressLocality: place, addressCountry: "BD" }
      : undefined,
    geo:
      vet.lat !== null && vet.lon !== null
        ? { "@type": "GeoCoordinates", latitude: vet.lat, longitude: vet.lon }
        : undefined,
    employee: { "@type": "Person", name: vet.displayName, jobTitle: vet.title ?? "Veterinarian" },
    aggregateRating:
      vet.ratingCount > 0 && vet.rating !== null
        ? { "@type": "AggregateRating", ratingValue: vet.rating, reviewCount: vet.ratingCount }
        : undefined,
  };

  const services = [
    { icon: MessageCircle, label: t("pubui.vet.chatCard"), on: true },
    { icon: CalendarDays, label: t("pubui.vet.visitCard"), on: vet.hasSchedule },
    { icon: Home, label: t("vets.homeVisit"), on: vet.homeVisit },
    { icon: Siren, label: t("vets.emergency"), on: vet.emergency24x7 },
  ].filter((s) => s.on);

  const stats = [
    vet.rating !== null
      ? {
          key: "rating",
          value: fmt.number(vet.rating),
          label: t("pubui.vet.reviewsCount", { n: fmt.number(vet.ratingCount) }),
          icon: Star,
        }
      : null,
    vet.consultCount > 0
      ? {
          key: "consults",
          value: fmt.number(vet.consultCount),
          label: t("pubui.vet.statConsults"),
          icon: MessagesSquare,
        }
      : null,
    vet.experienceYears
      ? {
          key: "exp",
          value: fmt.number(vet.experienceYears),
          label: t("pubui.vet.statYears"),
          icon: GraduationCap,
        }
      : null,
  ].filter((s) => s !== null);

  return (
    <article>
      <JsonLd data={jsonLd} />

      {/* Profile hero */}
      <header data-no-reveal className="surface-soft dots">
        <div className="container-page grid gap-6 pt-6 pb-10 md:pt-8 md:pb-14">
          <nav>
            <Link
              href={localeHref(locale, ROUTES.vets)}
              className="inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-(--shadow-control) transition-colors hover:text-foreground"
            >
              <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
              {t("pubui.vet.back")}
            </Link>
          </nav>
          <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-8">
            <div className="relative w-fit">
              <VetPhoto vet={vet} className="size-28 shadow-(--shadow-card) ring-4 ring-card md:size-36" />
              {vet.availableNow ? (
                <span className="absolute end-1.5 bottom-1.5 size-5 rounded-full border-3 border-card bg-success md:end-2.5 md:bottom-2.5">
                  <span className="absolute inset-0 live-ping rounded-full bg-success" />
                  <span className="sr-only">{t("vets.onlineNow")}</span>
                </span>
              ) : null}
            </div>
            <div className="grid min-w-0 gap-3">
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="primary">{t("common.verified")}</StatusBadge>
                {vet.availableNow ? <StatusBadge tone="success">{t("vets.onlineNow")}</StatusBadge> : null}
                {vet.emergency24x7 ? <StatusBadge tone="danger">{t("vets.emergency")}</StatusBadge> : null}
                {vet.featured ? <StatusBadge tone="warning">{t("common.sponsored")}</StatusBadge> : null}
                {vet.isDemo ? <StatusBadge>{t("common.demo")}</StatusBadge> : null}
              </div>
              <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight text-balance md:text-5xl">
                {vet.displayName}
              </h1>
              {vet.title ? <p className="text-lg text-pretty text-foreground/80">{vet.title}</p> : null}
              {place || vet.clinicName ? (
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span>{[vet.clinicName, place].filter(Boolean).join(", ")}</span>
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap gap-2 max-md:hidden">
                <ButtonLink href={chatHref} variant="brand" size="lg">
                  <MessageCircle aria-hidden="true" />
                  {chatLabel}
                </ButtonLink>
                {vet.hasSchedule ? (
                  <ButtonLink href={bookHref} size="lg" variant="outline">
                    <CalendarDays aria-hidden="true" />
                    {t("vets.book")}
                  </ButtonLink>
                ) : null}
              </div>
              <VetContactButtons
                providerId={vet.id}
                phone={vet.phonePublic}
                lat={vet.lat}
                lon={vet.lon}
                name={vet.displayName}
              />
            </div>
          </div>
          {stats.length > 0 ? (
            <dl className="grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
              {stats.map((s) => (
                <div
                  key={s.key}
                  className="grid gap-0.5 rounded-(--radius-xl) bg-card px-3 py-3 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:px-4"
                >
                  <dt className="order-2 truncate text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="flex items-center gap-1.5 font-heading text-xl font-bold tabular-nums sm:text-2xl">
                    <s.icon
                      aria-hidden="true"
                      className={cn(
                        "size-4 shrink-0",
                        s.key === "rating" ? "fill-highlight text-highlight" : "text-primary",
                      )}
                    />
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </header>

      <div className="container-page grid grid-cols-1 gap-6 py-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        {/* Prices and hours: first on phones (what owners decide on), a sticky side column on desktop */}
        <aside className="grid gap-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
          <h2 className="sr-only">{t("pubui.vet.actions")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <section className="grid content-start gap-3 rounded-(--radius-2xl) bg-card p-5 shadow-(--shadow-card) ring-2 ring-primary/25">
              <div className="flex items-start justify-between gap-3">
                <h3 className="flex items-center gap-2 font-heading font-semibold">
                  <span className="grid size-9 place-items-center rounded-(--radius-lg) bg-primary/10 text-primary">
                    <MessageCircle aria-hidden="true" className="size-4.5" />
                  </span>
                  {t("pubui.vet.chatCard")}
                </h3>
                <p className="grid text-end leading-tight">
                  <span className="font-heading text-2xl font-bold tabular-nums">
                    {taka(fmt, vet.consultFee)}
                  </span>
                  <span className="text-xs text-muted-foreground">{t("pubui.vet.perChat")}</span>
                </p>
              </div>
              <p className="text-sm text-pretty text-muted-foreground">
                {t("pubui.vet.chatCardSub", { window: fmt.number(business.consult.replyWindowMinutes) })}
              </p>
              {vet.availableNow ? null : <VetOfflineNotice t={t} fmt={fmt} />}
              <ButtonLink href={chatHref} variant="brand" className="w-full">
                {t("vets.chatNow")}
              </ButtonLink>
            </section>
            <section className="grid content-start gap-3 rounded-(--radius-2xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="flex items-center gap-2 font-heading font-semibold">
                  <span className="grid size-9 place-items-center rounded-(--radius-lg) bg-highlight/25 text-highlight-foreground dark:text-highlight">
                    <CalendarDays aria-hidden="true" className="size-4.5" />
                  </span>
                  {t("pubui.vet.visitCard")}
                </h3>
                <p className="grid text-end leading-tight">
                  <span className="font-heading text-2xl font-bold tabular-nums">
                    {taka(fmt, vet.visitFee)}
                  </span>
                  <span className="text-xs text-muted-foreground">{t("pubui.vet.atClinic")}</span>
                </p>
              </div>
              {vet.hasSchedule ? (
                <>
                  <p className="text-sm text-pretty text-muted-foreground">
                    {t("pubui.vet.visitCardSub", { booking: taka(fmt, business.appointment.bookingFee) })}
                  </p>
                  <ButtonLink href={bookHref} variant="outline" className="w-full">
                    {t("vets.book")}
                  </ButtonLink>
                </>
              ) : (
                <p className="text-sm text-pretty text-muted-foreground">{t("pubui.vet.noSchedule")}</p>
              )}
            </section>
          </div>
          <Suspense fallback={<OpeningHoursSkeleton />}>
            <OpeningHours vet={vet} t={t} fmt={fmt} />
          </Suspense>
        </aside>

        <div className="grid min-w-0 gap-6 lg:col-start-1 lg:row-start-1">
          <SectionCard title={t("vets.about")} icon={Stethoscope}>
            <div className="grid gap-5">
              {vet.bio ? (
                <p className="max-w-prose leading-relaxed text-pretty whitespace-pre-wrap">{vet.bio}</p>
              ) : (
                <p className="text-muted-foreground">{t("pubui.vet.noBio")}</p>
              )}
              {animals.length > 0 ? (
                <div className="grid gap-2">
                  <h3 className="text-sm font-semibold">{t("vets.treats")}</h3>
                  <ul className="flex flex-wrap gap-2">
                    {animals.map((name) => (
                      <li
                        key={name}
                        className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground/85"
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="grid gap-2">
                <h3 className="text-sm font-semibold">{t("pubui.vet.services")}</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {services.map(({ icon: Icon, label }) => (
                    <li key={label} className="flex items-center gap-2.5 text-sm">
                      <span className="grid size-8 shrink-0 place-items-center rounded-(--radius-md) bg-primary/10 text-primary">
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t("pubui.vet.qualifications")} icon={GraduationCap}>
            <div className="grid gap-4">
              {vet.qualifications ? (
                <p className="leading-relaxed text-pretty whitespace-pre-wrap">{vet.qualifications}</p>
              ) : null}
              <div className="flex gap-3 rounded-(--radius-xl) bg-success/8 p-4 ring-1 ring-success/20">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
                <div className="grid gap-1 text-sm">
                  <p className="font-semibold">{t("pubui.vet.checkedTitle")}</p>
                  <p className="text-pretty text-muted-foreground">{t("pubui.vet.checkedBody")}</p>
                  {vet.registrationNo ? (
                    <p className="font-medium tabular-nums">
                      {t("vets.registration", { body: vet.registrationBody, no: vet.registrationNo })}
                    </p>
                  ) : null}
                  {vet.verifiedAt ? (
                    <p className="text-xs text-muted-foreground">
                      {t("vets.verifiedOn", { date: fmt.date(vet.verifiedAt) })}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </SectionCard>

          {vet.address || place ? (
            <SectionCard title={t("pubui.vet.location")} icon={MapPin}>
              <p className="grid gap-0.5 text-pretty">
                {vet.clinicName ? <span className="font-semibold">{vet.clinicName}</span> : null}
                {vet.address ? <span>{vet.address}</span> : null}
                {place ? <span className="text-sm text-muted-foreground">{place}</span> : null}
              </p>
            </SectionCard>
          ) : null}

          <SectionCard
            title={t("vets.reviews")}
            icon={Star}
            actions={
              vet.rating !== null ? (
                <span className="flex items-center gap-2 text-sm">
                  <Stars value={vet.rating} />
                  <span className="font-semibold tabular-nums">{fmt.number(vet.rating)}</span>
                  <span className="text-muted-foreground">
                    ({t("pubui.vet.reviewsCount", { n: fmt.number(vet.ratingCount) })})
                  </span>
                </span>
              ) : null
            }
          >
            {vet.reviews.length === 0 ? (
              <EmptyState
                icon={Star}
                title={t("vets.noReviews")}
                className="border-none bg-transparent py-6"
              />
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {vet.reviews.map((r) => (
                  <li key={r.id} className="grid content-start gap-2 rounded-(--radius-xl) bg-muted/50 p-4">
                    <span className="flex items-center justify-between gap-2">
                      <Stars value={r.rating} />
                      <span className="sr-only">{t("consult.stars", { n: r.rating })}</span>
                      <time dateTime={r.createdAt.toISOString()} className="text-xs text-muted-foreground">
                        {fmt.date(r.createdAt)}
                      </time>
                    </span>
                    {r.body ? <p className="text-sm text-pretty">{r.body}</p> : null}
                    <span className="text-xs font-medium text-muted-foreground">
                      {r.ownerName ?? t("menu.roleOwner")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <p className="text-xs text-muted-foreground">{t("footer.notAdvice")}</p>
        </div>
      </div>

      {/* Phones: the main actions stay in reach above the tab bar while the profile is on screen */}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/92 px-4 py-3 backdrop-blur md:hidden print:hidden">
        <div className="mx-auto flex max-w-xl gap-2">
          <ButtonLink href={chatHref} variant="brand" size="lg" className="min-w-0 flex-1">
            <MessageCircle aria-hidden="true" />
            <span className="truncate">{chatLabel}</span>
          </ButtonLink>
          {vet.hasSchedule ? (
            <ButtonLink href={bookHref} variant="outline" size="lg" aria-label={t("vets.book")}>
              <CalendarDays aria-hidden="true" />
              <span className="max-[380px]:sr-only">{t("pubui.card.book")}</span>
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function VetProfileSkeleton() {
  return (
    <div role="status">
      <div className="surface-soft">
        <div className="container-page grid gap-6 pt-6 pb-10 md:pt-8 md:pb-14">
          <Skeleton className="h-8 w-24 rounded-full" />
          <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-8">
            <Skeleton className="size-28 rounded-full md:size-36" />
            <div className="grid gap-3">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-[1lh] w-3/4 font-heading text-3xl leading-tight md:text-5xl" />
              <Skeleton className="h-[1lh] w-1/2 text-lg" />
              <Skeleton className="h-[1lh] w-2/5 text-sm" />
              <Skeleton className="h-(--control-h-lg) w-56 rounded-(--control-radius) max-md:hidden" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-17 rounded-(--radius-xl)" />
            ))}
          </div>
        </div>
      </div>
      <div className="container-page grid gap-6 py-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-start-2 lg:row-start-1 lg:grid-cols-1">
          <Skeleton className="h-44 rounded-(--radius-2xl)" />
          <Skeleton className="h-44 rounded-(--radius-2xl)" />
        </div>
        <div className="grid gap-6 lg:col-start-1 lg:row-start-1">
          <Skeleton className="h-64 rounded-(--radius-2xl)" />
          <Skeleton className="h-40 rounded-(--radius-2xl)" />
        </div>
      </div>
    </div>
  );
}

export default function VetPage({ params }: PageProps<"/[locale]/vet/[slug]">) {
  return (
    <Suspense fallback={<VetProfileSkeleton />}>
      <VetProfile params={params} />
    </Suspense>
  );
}
