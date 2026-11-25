import { PawPrint, Plus } from "lucide-react";
import { Suspense } from "react";
import { Spot } from "@/components/illustrations/spots";
import { PageHeader, StatusBadge } from "@/components/layout/app-ui";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { petPath, ROUTES } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import {
  AddPetCard,
  ageLabel,
  DUE_BADGE,
  PetCard,
  PetGridSkeleton,
  SEX_KEYS,
  weightLabel,
  worstState,
} from "@/features/pets";
import { listPets, upcomingCare } from "@/features/pets/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { dhakaDay } from "@/lib/dhaka";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("pets.title"), t("pets.sub"), ROUTES.pets, await getLocale());
}

async function Pets() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, ROUTES.pets));
  const [pets, care] = await Promise.all([listPets(viewer.id), upcomingCare(viewer.id)]);
  const today = dhakaDay(new Date());
  const addHref = localeHref(locale, ROUTES.newPet);
  const add = (
    <ButtonLink href={addHref} variant="brand" className="max-sm:w-full">
      <Plus aria-hidden="true" />
      {t("pets.add")}
    </ButtonLink>
  );
  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("pets.title")}
        sub={t("pets.sub")}
        icon={PawPrint}
        actions={pets.length > 0 ? add : undefined}
      />
      {pets.length === 0 ? (
        <div className="grid justify-items-center gap-4 rounded-(--radius-2xl) border-2 border-dashed border-foreground/15 bg-card/50 px-6 py-12 text-center">
          <Spot name="care" className="w-40" />
          <p className="font-heading text-lg font-semibold text-balance">{t("pets.empty")}</p>
          <p className="max-w-sm text-sm text-pretty text-muted-foreground">{t("ownerui.pets.emptyRow")}</p>
          <ButtonLink href={addHref} variant="brand" size="lg">
            <Plus aria-hidden="true" />
            {t("pets.add")}
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pets.map((pet) => {
            const state = worstState(
              care.filter((c) => c.petId === pet.id),
              today,
            );
            const badge = state === "none" ? null : DUE_BADGE[state];
            const facts = [
              ageLabel(t, fmt, pet.birthDate, today),
              pet.sex === "unknown" ? null : t(SEX_KEYS[pet.sex]),
              weightLabel(t, fmt, pet.weightGrams),
            ].filter((f): f is string => Boolean(f));
            return (
              <li key={pet.id} className="grid">
                <PetCard
                  pet={pet}
                  locale={locale}
                  href={localeHref(locale, petPath(pet.id))}
                  facts={facts}
                  status={badge ? <StatusBadge tone={badge.tone}>{t(badge.label)}</StatusBadge> : null}
                />
              </li>
            );
          })}
          <li className="grid">
            <AddPetCard href={addHref} label={t("pets.add")} hint={t("ownerui.pets.addHint")} />
          </li>
        </ul>
      )}
    </div>
  );
}

function PetsSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <div className="flex items-start gap-3.5">
        <Skeleton className="size-11 rounded-(--radius-xl) max-sm:hidden" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
      </div>
      <PetGridSkeleton />
    </div>
  );
}

export default function PetsPage() {
  return (
    <Suspense fallback={<PetsSkeleton />}>
      <Pets />
    </Suspense>
  );
}
