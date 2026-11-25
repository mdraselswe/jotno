import { ChevronRight, PawPrint, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { breedName, speciesName } from "@/content/places";
import { mediaUrl } from "@/infrastructure/storage";
import { cn } from "@/lib/utils";
import type { Pet } from "../server/queries";

export function PetAvatar({ pet, className }: { pet: Pick<Pet, "photoPath" | "name">; className?: string }) {
  const src = mediaUrl(pet.photoPath);
  return (
    <span
      className={cn(
        "relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- storage URL at a small fixed size
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <PawPrint aria-hidden="true" className="size-1/2" />
      )}
    </span>
  );
}

/** "Dog · Deshi" for a pet, in the page language. */
export function petKind(pet: Pick<Pet, "speciesId" | "breedId">, locale: string) {
  return [speciesName(pet.speciesId, locale), breedName(pet.breedId, locale)].filter(Boolean).join(" · ");
}

const CARD =
  "rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6 transition-[box-shadow,translate] duration-(--motion-base) ease-(--ease-ui) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:hover:translate-y-0";

/** A pet in the pets grid: photo, name, kind, a health pill and quick facts (age, sex, weight). */
export function PetCard({
  pet,
  href,
  locale,
  facts = [],
  status,
  extra,
}: {
  pet: Pet;
  href: Route;
  locale: string;
  /** Short chips under the name, e.g. ["3 yrs", "Female", "12 kg"]. */
  facts?: string[];
  /** A StatusBadge (vaccine due, up to date…). */
  status?: ReactNode;
  /** @deprecated pass `facts` instead. */
  extra?: string;
}) {
  const chips = extra ? [extra, ...facts] : facts;
  return (
    <Link href={href} className={cn(CARD, "group grid content-start gap-4 p-4 sm:p-5")}>
      <span className="flex items-center gap-4">
        <PetAvatar pet={pet} className="size-16 ring-4 ring-primary/8 sm:size-18" />
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="truncate font-heading text-lg leading-tight font-bold tracking-tight">
            {pet.name}
          </span>
          <span className="truncate text-sm text-muted-foreground">{petKind(pet, locale)}</span>
          {status}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-5 shrink-0 text-muted-foreground transition-transform duration-(--motion-fast) group-hover:translate-x-0.5 rtl:rotate-180"
        />
      </span>
      {chips.length > 0 ? (
        <span className="flex flex-wrap gap-1.5">
          {chips.map((f) => (
            <span
              key={f}
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80"
            >
              {f}
            </span>
          ))}
        </span>
      ) : null}
    </Link>
  );
}

/** A dashed "add a pet" card that sits at the end of the pets grid. */
export function AddPetCard({ href, label, hint }: { href: Route; label: string; hint?: string }) {
  return (
    <Link
      href={href}
      className="group grid min-h-32 place-content-center justify-items-center gap-2 rounded-(--radius-2xl) border-2 border-dashed border-foreground/15 p-5 text-center transition-colors duration-(--motion-fast) hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary transition-transform duration-(--motion-base) ease-spring group-hover:scale-110 motion-reduce:group-hover:scale-100">
        <Plus aria-hidden="true" className="size-5" />
      </span>
      <span className="font-heading font-semibold">{label}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </Link>
  );
}

/** A compact pet for the account home row: photo, name, kind and age. */
export function PetTile({
  pet,
  href,
  locale,
  sub,
  status,
}: {
  pet: Pet;
  href: Route;
  locale: string;
  sub?: string;
  status?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(CARD, "grid w-38 shrink-0 snap-start justify-items-center gap-2 p-4 text-center")}
    >
      <PetAvatar pet={pet} className="size-18 ring-4 ring-primary/8" />
      <span className="grid w-full min-w-0 gap-0.5">
        <span className="truncate font-heading font-bold">{pet.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {[speciesName(pet.speciesId, locale), sub].filter(Boolean).join(" · ")}
        </span>
      </span>
      {status}
    </Link>
  );
}

/** The same "add" action, shaped like a PetTile. */
export function AddPetTile({ href, label }: { href: Route; label: string }) {
  return (
    <Link
      href={href}
      className="group grid w-38 shrink-0 snap-start place-content-center justify-items-center gap-2 rounded-(--radius-2xl) border-2 border-dashed border-foreground/15 p-4 text-center transition-colors duration-(--motion-fast) hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary transition-transform duration-(--motion-base) ease-spring group-hover:scale-110 motion-reduce:group-hover:scale-100">
        <Plus aria-hidden="true" className="size-5" />
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

/** Loading twin of a PetCard grid. */
export function PetGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="grid gap-4 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full sm:size-18" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-36 max-w-full" />
            </div>
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Loading twin of the pet form: header, then section cards. */
export function PetFormSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="grid max-w-2xl gap-5">
        <Skeleton className="h-40 rounded-(--radius-2xl)" />
        <Skeleton className="h-72 rounded-(--radius-2xl)" />
        <Skeleton className="h-36 rounded-(--radius-2xl)" />
      </div>
    </div>
  );
}
