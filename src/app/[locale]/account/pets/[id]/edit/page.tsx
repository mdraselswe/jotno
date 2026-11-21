import { notFound } from "next/navigation";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { petPath } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { PetForm } from "@/features/pets";
import { getPet } from "@/features/pets/server";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("account.pets"), robots: { index: false } };
}

async function EditPet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const viewer = await requireViewer(locale, localeHref(locale, `${petPath(id)}/edit`));
  const found = await getPet(viewer.id, id);
  if (!found) notFound();
  const { pet } = found;
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("pets.edit", { name: pet.name })} />
      <PetForm
        initial={{
          id: pet.id,
          name: pet.name,
          speciesId: pet.speciesId,
          breedId: pet.breedId,
          sex: pet.sex,
          birthDate: pet.birthDate,
          weightKg: pet.weightGrams == null ? null : pet.weightGrams / 1000,
          color: pet.color,
          notes: pet.notes,
          photoPath: pet.photoPath,
        }}
      />
    </div>
  );
}

export default function EditPetPage({ params }: PageProps<"/[locale]/account/pets/[id]/edit">) {
  return (
    <Private rows={2}>
      <EditPet params={params} />
    </Private>
  );
}
