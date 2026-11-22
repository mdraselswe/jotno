import { PawPrint } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
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

export function PetCard({
  pet,
  href,
  locale,
  extra,
}: {
  pet: Pet;
  href: Route;
  locale: string;
  extra?: string;
}) {
  const kind = [speciesName(pet.speciesId, locale), breedName(pet.breedId, locale)]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card) transition-[box-shadow,translate] duration-(--motion-fast) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover)"
    >
      <PetAvatar pet={pet} />
      <span className="grid min-w-0 gap-0.5">
        <span className="truncate font-heading text-lg font-semibold">{pet.name}</span>
        <span className="truncate text-sm text-muted-foreground">{kind}</span>
        {extra ? <span className="text-xs text-muted-foreground">{extra}</span> : null}
      </span>
    </Link>
  );
}
