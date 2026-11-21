import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { EMPTY_PET, PetForm } from "@/features/pets";
import { getLocale, getT } from "@/i18n/server";
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
      <PrivateHeading title={t("pets.new")} />
      <PetForm initial={EMPTY_PET} />
    </div>
  );
}

export default function NewPetPage() {
  return (
    <Private rows={2}>
      <NewPet />
    </Private>
  );
}
