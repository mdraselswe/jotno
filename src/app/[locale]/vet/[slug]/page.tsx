import {
  BadgeCheck,
  CalendarDays,
  Clock,
  GraduationCap,
  MapPin,
  MessageCircle,
  Siren,
  Star,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { JsonLd } from "@/components/ui/json-ld";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { site } from "@/config";
import { LOCALES, localePath } from "@/config/locale";
import { bookPath, consultStartPath, pageUrl, vetPath } from "@/config/routes";
import { VetContactButtons, VetPhoto } from "@/features/providers";
import { SPECIES } from "@/content/geo";
import { getProviderBySlug, recordStat } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export async function generateMetadata({ params }: PageProps<"/[locale]/vet/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const vet = await getProviderBySlug(slug);
  if (!vet) return { title: "Vet", robots: { index: false } };
  const place = [locale === "bn" ? vet.areaBn : vet.areaEn, locale === "bn" ? vet.districtBn : vet.districtEn]
    .filter(Boolean)
    .join(", ");
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

async function VetProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const vet = await getProviderBySlug(slug);
  if (!vet) notFound();
  after(() => recordStat(vet.id, "views"));

  const place = [locale === "bn" ? vet.areaBn : vet.areaEn, locale === "bn" ? vet.districtBn : vet.districtEn]
    .filter(Boolean)
    .join(", ");
  const speciesNames = vet.species
    .map((slug) => SPECIES.find((s) => s.slug === slug))
    .filter((s) => s !== undefined)
    .map((s) => (locale === "bn" ? s.bn : s.en));
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

  return (
    <article className="grid gap-8">
      <JsonLd data={jsonLd} />
      <header className="grid gap-5 md:grid-cols-[auto_1fr] md:items-center">
        <div className="relative w-fit">
          <VetPhoto vet={vet} className="size-28 md:size-32" />
          {vet.availableNow ? (
            <span className="absolute end-1 bottom-1 size-5 live-ping rounded-full border-3 border-background bg-success" />
          ) : null}
        </div>
        <div className="grid gap-2">
          <h1 className="flex flex-wrap items-center gap-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            {vet.displayName}
            <BadgeCheck aria-label={t("common.verified")} className="size-6 text-primary" />
          </h1>
          {vet.title ? <p className="text-lg text-muted-foreground">{vet.title}</p> : null}
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {place ? (
              <li className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-4" />
                {vet.clinicName ? `${vet.clinicName}, ` : ""}
                {place}
              </li>
            ) : null}
            {vet.rating !== null ? (
              <li className="inline-flex items-center gap-1">
                <Star aria-hidden="true" className="size-4 fill-highlight text-highlight" />
                {fmt.number(vet.rating)} · {t("vets.reviews")} {fmt.number(vet.ratingCount)}
              </li>
            ) : null}
            {vet.experienceYears ? (
              <li className="inline-flex items-center gap-1">
                <Clock aria-hidden="true" className="size-4" />
                {t("vets.experience", { n: fmt.number(vet.experienceYears) })}
              </li>
            ) : null}
            {vet.consultCount > 0 ? <li>{t("vets.consults", { n: fmt.number(vet.consultCount) })}</li> : null}
            {vet.emergency24x7 ? (
              <li className="inline-flex items-center gap-1 text-destructive">
                <Siren aria-hidden="true" className="size-4" />
                {t("vets.emergency")}
              </li>
            ) : null}
          </ul>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <ButtonLink href={localeHref(locale, consultStartPath(vet.slug))} size="lg">
          <MessageCircle aria-hidden="true" />
          {t("vets.startChat", { fee: taka(fmt, vet.consultFee) })}
        </ButtonLink>
        {vet.hasSchedule ? (
          <ButtonLink href={localeHref(locale, bookPath(vet.slug))} size="lg" variant="outline">
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

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <section className="grid content-start gap-3" aria-labelledby="about-h">
          <h2 id="about-h" className="font-heading text-xl font-semibold">
            {t("vets.about")}
          </h2>
          {vet.bio ? <p className="max-w-prose text-pretty whitespace-pre-wrap">{vet.bio}</p> : null}
          {speciesNames.length > 0 ? (
            <p className="text-sm">
              <span className="font-medium">{t("vets.treats")}: </span>
              {speciesNames.join(", ")}
            </p>
          ) : null}
        </section>
        <aside className="glow-border relative grid content-start gap-3 rounded-(--radius-2xl) bg-card p-(--card-pad) text-sm shadow-(--shadow-card)">
          {vet.qualifications ? (
            <p className="inline-flex items-start gap-2">
              <GraduationCap aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              {vet.qualifications}
            </p>
          ) : null}
          {vet.registrationNo ? (
            <p className="inline-flex items-start gap-2">
              <BadgeCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              {t("vets.registration", { body: vet.registrationBody, no: vet.registrationNo })}
            </p>
          ) : null}
          {vet.verifiedAt ? (
            <p className="text-muted-foreground">
              {t("vets.verifiedOn", { date: fmt.date(vet.verifiedAt) })}
            </p>
          ) : null}
          {vet.address ? <p className="text-muted-foreground">{vet.address}</p> : null}
          <p className="text-muted-foreground">
            {t("vet.visitFee")}: {taka(fmt, vet.visitFee)}
          </p>
        </aside>
      </div>

      <section className="grid gap-3" aria-labelledby="reviews-h">
        <h2 id="reviews-h" className="font-heading text-xl font-semibold">
          {t("vets.reviews")}
        </h2>
        {vet.reviews.length === 0 ? (
          <p className="text-muted-foreground">{t("vets.noReviews")}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {vet.reviews.map((r) => (
              <li
                key={r.id}
                className="glow-border relative grid gap-1 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card)"
              >
                <span className="flex items-center gap-1" aria-label={t("consult.stars", { n: r.rating })}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      aria-hidden="true"
                      className={
                        i < r.rating
                          ? "size-4 fill-highlight text-highlight"
                          : "size-4 text-muted-foreground/40"
                      }
                    />
                  ))}
                </span>
                {r.body ? <p className="text-pretty">{r.body}</p> : null}
                <span className="text-xs text-muted-foreground">
                  {r.ownerName ?? "—"} · {fmt.date(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

function VetProfileSkeleton() {
  return (
    <div role="status" className="grid gap-8">
      <div className="flex items-center gap-5">
        <Skeleton className="size-28 rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
      </div>
      <Skeleton className="h-11 w-56" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function VetPage({ params }: PageProps<"/[locale]/vet/[slug]">) {
  return (
    <div className="container-page py-8 md:py-12">
      <Suspense fallback={<VetProfileSkeleton />}>
        <VetProfile params={params} />
      </Suspense>
    </div>
  );
}
