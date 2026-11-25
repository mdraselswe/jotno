import { PawPrint } from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/app-ui";
import { ROUTES } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { EMPTY_PET, PetForm, PetFormSkeleton } from "@/features/pets";
import { getLocale, getT } from "@/i18n/server";
import { dhakaDay } from "@/lib/dhaka";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("pets.new"), t("pets.sub"), ROUTES.newPet, await getLocale());
}

async function NewPet() {
  const locale = await getLocale();
  const t = await getT();
  await requireViewer(locale, localeHref(locale, ROUTES.newPet));
  return (
    <div className="grid gap-6">
      <PageHeader title={t("pets.new")} sub={t("pets.sub")} icon={PawPrint} />
      <PetForm
        initial={EMPTY_PET}
        today={dhakaDay(new Date())}
        cancelHref={localeHref(locale, ROUTES.pets)}
      />
    </div>
  );
}

export default function NewPetPage() {
  return (
    <Suspense fallback={<PetFormSkeleton />}>
      <NewPet />
    </Suspense>
  );
}
