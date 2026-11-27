import {
  BadgeCheck,
  CalendarDays,
  Home,
  MapPin,
  MessageCircle,
  Siren,
  Star,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { bookPath, consultStartPath, vetPath } from "@/config/routes";
import { SPECIES } from "@/content/geo";
import type { Formatter, Translate } from "@/i18n";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ProviderCard } from "../server/queries";

export function VetPhoto({
  vet,
  className,
}: {
  vet: Pick<ProviderCard, "photoUrl" | "displayName" | "id">;
  className?: string;
}) {
  return (
    <ViewTransition name={`vet-photo-${vet.id}`}>
      <span
        className={cn(
          "relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary",
          className,
        )}
      >
        {vet.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage URL at a small fixed size
          <img src={vet.photoUrl} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <Stethoscope aria-hidden="true" className="size-1/2" />
        )}
      </span>
    </ViewTransition>
  );
}

/** Vet's place in the page language: "Dhanmondi, Dhaka". */
export function vetPlace(
  vet: Pick<ProviderCard, "areaBn" | "areaEn" | "districtBn" | "districtEn">,
  locale: string,
): string {
  return [locale === "bn" ? vet.areaBn : vet.areaEn, locale === "bn" ? vet.districtBn : vet.districtEn]
    .filter(Boolean)
    .join(", ");
}

/** Species slugs → names in the page language. */
export function speciesNames(slugs: readonly string[], locale: string): string[] {
  return slugs
    .map((slug) => SPECIES.find((s) => s.slug === slug))
    .filter((s) => s !== undefined)
    .map((s) => (locale === "bn" ? s.bn : s.en));
}

const MAX_SPECIES = 3;

/**
 * One vet in a list: photo with the live dot, name + verified badge, title
 * and clinic, place, rating, animals, chat fee, and the two main actions
 * (chat, book). The name is the card's link (stretched over the card), so
 * the buttons stay separate, real links.
 */
export function VetCard({
  vet,
  locale,
  t,
  fmt,
}: {
  vet: ProviderCard;
  locale: string;
  t: Translate;
  fmt: Formatter;
}) {
  const place = vetPlace(vet, locale);
  const animals = speciesNames(vet.species, locale);
  const shown = animals.slice(0, MAX_SPECIES);
  const subtitle = [vet.title, vet.clinicName].filter(Boolean).join(" · ");
  return (
    <article
      className={cn(
        "group glow-border relative grid h-full content-between gap-4 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card) ring-1 ring-foreground/6 transition-[box-shadow,translate] duration-(--motion-base) ease-(--ease-ui) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover)",
        vet.featured && "bg-[color-mix(in_oklch,var(--highlight)_8%,var(--card))]",
      )}
    >
      <div className="flex gap-3.5 sm:gap-4">
        <span className="relative h-fit">
          <VetPhoto vet={vet} className="size-16 sm:size-18" />
          {vet.availableNow ? (
            <span
              aria-hidden="true"
              className="absolute end-0.5 bottom-0.5 size-4 rounded-full border-2 border-card bg-success"
            />
          ) : null}
        </span>
        <div className="grid min-w-0 flex-1 content-start gap-1">
          <div className="flex min-w-0 items-start gap-2">
            <h3 className="flex min-w-0 items-center gap-1.5 font-heading text-lg leading-tight font-semibold">
              <Link
                href={localeHref(locale, vetPath(vet.slug))}
                className="line-clamp-2 rounded-sm break-words after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] hover:text-primary focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
              >
                {vet.displayName}
              </Link>
              <BadgeCheck aria-label={t("common.verified")} className="size-4.5 shrink-0 text-primary" />
            </h3>
            {vet.featured ? (
              <span className="ms-auto shrink-0 rounded-full bg-highlight/25 px-2 py-0.5 text-[0.6875rem] font-semibold text-highlight-foreground dark:text-highlight">
                {t("common.sponsored")}
              </span>
            ) : null}
          </div>
          {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {place ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">
                  {place}
                  {vet.distanceKm !== null ? ` · ${t("vets.km", { n: fmt.number(vet.distanceKm) })}` : null}
                </span>
              </span>
            ) : null}
            {vet.rating !== null ? (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <span className="sr-only">
                  {t("pubui.card.rating", { rating: fmt.number(vet.rating), n: fmt.number(vet.ratingCount) })}
                </span>
                <Star aria-hidden="true" className="size-3.5 fill-highlight text-highlight" />
                <span aria-hidden="true">
                  {fmt.number(vet.rating)}{" "}
                  <span className="font-normal text-muted-foreground">({fmt.number(vet.ratingCount)})</span>
                </span>
              </span>
            ) : (
              <span className="text-xs">{t("pubui.card.newVet")}</span>
            )}
            {vet.experienceYears ? (
              <span>{t("pubui.card.years", { n: fmt.number(vet.experienceYears) })}</span>
            ) : null}
          </p>
        </div>
      </div>

      <ul className="flex flex-wrap items-center gap-1.5 text-xs empty:hidden">
        {vet.availableNow ? (
          <li className="inline-flex h-6 items-center gap-1.5 rounded-full bg-success/15 px-2.5 font-semibold text-success dark:text-[color-mix(in_oklch,var(--success),white_35%)]">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />
            {t("vets.onlineNow")}
          </li>
        ) : null}
        {vet.emergency24x7 ? (
          <li className="inline-flex h-6 items-center gap-1 rounded-full bg-destructive/10 px-2.5 font-medium text-destructive">
            <Siren aria-hidden="true" className="size-3" />
            {t("vets.emergency")}
          </li>
        ) : null}
        {vet.homeVisit ? (
          <li className="inline-flex h-6 items-center gap-1 rounded-full bg-info/12 px-2.5 font-medium text-info dark:text-[color-mix(in_oklch,var(--info),white_35%)]">
            <Home aria-hidden="true" className="size-3" />
            {t("vets.homeVisit")}
          </li>
        ) : null}
        {shown.map((name) => (
          <li
            key={name}
            className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-foreground/80"
          >
            {name}
          </li>
        ))}
        {animals.length > shown.length ? (
          <li className="inline-flex h-6 items-center rounded-full bg-muted px-2 text-muted-foreground">
            {t("pubui.card.more", { n: fmt.number(animals.length - shown.length) })}
          </li>
        ) : null}
        {vet.isDemo ? (
          <li className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-muted-foreground">
            {t("common.demo")}
          </li>
        ) : null}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-foreground/8 pt-3.5">
        <p className="grid leading-tight">
          <span className="text-xs text-muted-foreground">{t("pubui.card.chatFee")}</span>
          <span className="font-heading text-lg font-bold tabular-nums">{taka(fmt, vet.consultFee)}</span>
        </p>
        <div className="relative z-10 flex items-center gap-2">
          {vet.hasSchedule ? (
            <ButtonLink
              href={localeHref(locale, bookPath(vet.slug))}
              variant="outline"
              size="sm"
              aria-label={t("appt.bookTitle", { name: vet.displayName })}
            >
              <CalendarDays aria-hidden="true" />
              {t("pubui.card.book")}
            </ButtonLink>
          ) : null}
          <ButtonLink
            href={localeHref(locale, consultStartPath(vet.slug))}
            variant="brand"
            size="sm"
            aria-label={t("pubui.card.chatWith", { name: vet.displayName })}
          >
            <MessageCircle aria-hidden="true" />
            {t("pubui.card.chat")}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}

/** VetCard's loading twin: same box, same rows. */
export function VetCardSkeleton() {
  return (
    <div className="grid h-full content-between gap-4 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card) ring-1 ring-foreground/6">
      <div className="flex gap-3.5 sm:gap-4">
        <Skeleton className="size-16 shrink-0 rounded-full sm:size-18" />
        <div className="grid flex-1 content-start gap-1">
          <Skeleton className="h-[1lh] w-2/3 font-heading text-lg leading-tight" />
          <Skeleton className="h-[1lh] w-1/2 text-sm" />
          <Skeleton className="h-[1lh] w-3/5 text-sm" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-foreground/8 pt-3.5">
        <div className="grid gap-1">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-[1lh] w-16 font-heading text-lg leading-tight" />
        </div>
        <Skeleton className="h-(--control-h-sm) w-24 rounded-(--control-radius)" />
      </div>
    </div>
  );
}
