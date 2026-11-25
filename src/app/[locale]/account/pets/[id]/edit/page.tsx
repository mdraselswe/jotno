import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/app-ui";
import { petPath } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { PetForm, PetFormSkeleton } from "@/features/pets";
import { getPet } from "@/features/pets/server";
import { getLocale, getT } from "@/i18n/server";
import { dhakaDay } from "@/lib/dhaka";
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
  const back = localeHref(locale, petPath(pet.id));
  return (
    <div className="grid gap-6">
      <Link
        href={back}
        className="inline-flex w-fit items-center gap-1.5 rounded-(--radius-md) text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {pet.name}
      </Link>
      <PageHeader title={t("pets.edit", { name: pet.name })} icon={Pencil} />
      <PetForm
        today={dhakaDay(new Date())}
        cancelHref={back}
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
    <Suspense fallback={<PetFormSkeleton />}>
      <EditPet params={params} />
    </Suspense>
  );
}
