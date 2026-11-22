import { Plus } from "lucide-react";
import { Spot } from "@/components/illustrations/spots";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ButtonLink } from "@/components/ui/button-link";
import { petPath, ROUTES } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { PetCard, petAge } from "@/features/pets";
import { listPets } from "@/features/pets/server";
import { getLocale, getT } from "@/i18n/server";
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
  const viewer = await requireViewer(locale, localeHref(locale, ROUTES.pets));
  const pets = await listPets(viewer.id);
  const today = dhakaDay(new Date());
  const add = (
    <ButtonLink href={localeHref(locale, ROUTES.newPet)}>
      <Plus aria-hidden="true" />
      {t("pets.add")}
    </ButtonLink>
  );
  return (
    <div className="grid gap-6">
      <PrivateHeading
        title={t("pets.title")}
        sub={t("pets.sub")}
        action={pets.length > 0 ? add : undefined}
      />
      {pets.length === 0 ? (
        <div className="grid justify-items-center gap-4 rounded-(--radius-xl) border-(length:--border-w) border-dashed p-10 text-center">
          <Spot name="care" className="w-36" />
          <p className="max-w-sm text-muted-foreground">{t("pets.empty")}</p>
          {add}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => {
            const age = petAge(pet.birthDate, today);
            return (
              <PetCard
                key={pet.id}
                pet={pet}
                locale={locale}
                href={localeHref(locale, petPath(pet.id))}
                extra={
                  age ? t(age.unit === "years" ? "pets.age" : "pets.ageMonths", { n: age.n }) : undefined
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PetsPage() {
  return (
    <Private>
      <Pets />
    </Private>
  );
}
