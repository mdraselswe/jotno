import { BadgeCheck, Home, MapPin, Siren, Star, Stethoscope } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import { vetPath } from "@/config/routes";
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

/** One vet in a list: photo, verified badge, place, rating, fee, live dot. */
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
  const place = [locale === "bn" ? vet.areaBn : vet.areaEn, locale === "bn" ? vet.districtBn : vet.districtEn]
    .filter(Boolean)
    .join(", ");
  return (
    <Link
      href={localeHref(locale, vetPath(vet.slug))}
      className={cn(
        "group relative flex gap-4 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad) shadow-(--shadow-card) transition-[box-shadow,translate] duration-(--motion-fast) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover)",
        vet.featured && "border-highlight/60",
      )}
    >
      <span className="relative">
        <VetPhoto vet={vet} />
        {vet.availableNow ? (
          <span className="absolute end-0 bottom-0 size-4 rounded-full border-2 border-card bg-success">
            <span className="sr-only">{t("vets.onlineNow")}</span>
          </span>
        ) : null}
      </span>
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-heading text-lg leading-tight font-semibold">{vet.displayName}</span>
          <BadgeCheck aria-label={t("common.verified")} className="size-4 shrink-0 text-primary" />
          {vet.featured ? (
            <span className="rounded-full bg-highlight/20 px-2 py-0.5 text-[0.6875rem] font-medium text-highlight-foreground">
              {t("common.sponsored")}
            </span>
          ) : null}
          {vet.isDemo ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] text-muted-foreground">
              {t("common.demo")}
            </span>
          ) : null}
        </span>
        {vet.title ? <span className="truncate text-sm text-muted-foreground">{vet.title}</span> : null}
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {place ? (
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden="true" className="size-3.5" />
              {place}
              {vet.distanceKm !== null ? ` · ${t("vets.km", { n: fmt.number(vet.distanceKm) })}` : null}
            </span>
          ) : null}
          {vet.rating !== null ? (
            <span className="inline-flex items-center gap-1">
              <Star aria-hidden="true" className="size-3.5 fill-highlight text-highlight" />
              {fmt.number(vet.rating)} ({fmt.number(vet.ratingCount)})
            </span>
          ) : null}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
            {t("vets.chatFrom", { fee: taka(fmt, vet.consultFee) })}
          </span>
          {vet.emergency24x7 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
              <Siren aria-hidden="true" className="size-3" />
              {t("vets.emergency")}
            </span>
          ) : null}
          {vet.homeVisit ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
              <Home aria-hidden="true" className="size-3" />
              {t("vets.homeVisit")}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
