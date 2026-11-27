import "server-only";
import { MapPin, PawPrint, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { districtPath, speciesPath } from "@/config/routes";
import { DISTRICTS } from "@/content/geo";
import { districtSlug } from "@/content/places";
import { SPECIES_PAGE_SLUGS, speciesPages } from "@/content/species-pages";
import { pickLocale } from "@/i18n";
import { getFormatter, getLocale } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { stripAccent } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import { vetCountsByDistrict, vetCountsBySpecies } from "./queries";

/**
 * Links to the vet landing pages (districts, animals) that have real vets,
 * most vets first. Render nothing while none has one. Internal links are how
 * search engines find, and rank, those pages.
 */
interface Chip {
  key: string;
  href: Route;
  label: string;
  count: number;
}

async function Chips({
  id,
  title,
  icon: Icon,
  chips,
  className,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  chips: Chip[];
  className?: string;
}) {
  const fmt = await getFormatter();
  if (chips.length === 0) return null;
  return (
    <section className={cn("grid gap-4", className)} aria-labelledby={id}>
      <h2 id={id} className="font-heading text-2xl font-bold tracking-tight">
        {title}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <li key={c.key}>
            <Link
              href={c.href}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-card px-3.5 text-sm font-medium shadow-(--shadow-control) ring-1 ring-foreground/6 transition-colors duration-(--motion-fast) hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Icon aria-hidden="true" className="size-3.5 text-primary" />
              {c.label}
              <span className="text-muted-foreground tabular-nums">{fmt.number(c.count)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function DistrictLinks({
  title,
  exclude,
  className,
}: {
  title: string;
  exclude?: number;
  className?: string;
}) {
  const locale = await getLocale();
  const counts = await vetCountsByDistrict();
  const chips = counts
    .filter((c) => c.districtId !== exclude && c.count > 0)
    .flatMap((c) => {
      const d = DISTRICTS.find((x) => x.id === c.districtId);
      return d
        ? [
            {
              key: String(d.id),
              href: localeHref(locale, districtPath(districtSlug(d))),
              label: locale === "bn" ? d.bn : d.en,
              count: c.count,
            },
          ]
        : [];
    })
    .sort((a, b) => b.count - a.count);
  return <Chips id="district-links" title={title} icon={MapPin} chips={chips} className={className} />;
}

export async function SpeciesLinks({
  title,
  exclude,
  className,
}: {
  title: string;
  exclude?: string;
  className?: string;
}) {
  const locale = await getLocale();
  const pages = pickLocale(speciesPages, locale);
  const counts = await vetCountsBySpecies();
  const chips = SPECIES_PAGE_SLUGS.flatMap((slug) => {
    const count = counts.find((c) => c.slug === slug)?.count ?? 0;
    return slug !== exclude && count > 0
      ? [
          {
            key: slug,
            href: localeHref(locale, speciesPath(slug)),
            label: stripAccent(pages[slug].h1),
            count,
          },
        ]
      : [];
  });
  return <Chips id="species-links" title={title} icon={PawPrint} chips={chips} className={className} />;
}
