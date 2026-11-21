import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { VetDocuments, VetProfileForm } from "@/features/providers";
import { requireVet } from "@/features/providers/server";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("vet.profile"), t("vet.completenessHint"), ROUTES.vetProfile, await getLocale());
}

const taka = (poisha: number) => String(Math.round(poisha / 100));

async function Profile() {
  const locale = await getLocale();
  const t = await getT();
  const { provider: p } = await requireVet(locale, localeHref(locale, ROUTES.vetProfile));
  const locked = p.status === "pending";
  return (
    <div className="grid gap-8">
      <PrivateHeading title={t("vet.profile")} sub={t("vet.completenessHint")} />
      <VetProfileForm
        initial={{
          displayName: p.displayName,
          title: p.title ?? "",
          bio: p.bio ?? "",
          qualifications: p.qualifications ?? "",
          registrationNo: p.registrationNo ?? "",
          experienceYears: p.experienceYears == null ? "" : String(p.experienceYears),
          consultFeeTaka: taka(p.consultFee),
          visitFeeTaka: taka(p.visitFee),
          clinicName: p.clinicName ?? "",
          address: p.address ?? "",
          districtId: p.districtId,
          areaId: p.areaId,
          lat: p.lat,
          lon: p.lon,
          phonePublic: p.phonePublic ?? "",
          emergency24x7: p.emergency24x7,
          homeVisit: p.homeVisit,
          photoPath: p.photoPath,
          speciesIds: p.speciesIds,
        }}
      />
      <section
        className="grid max-w-3xl gap-3 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad)"
        aria-labelledby="docs-h"
      >
        <h2 id="docs-h" className="font-heading text-lg font-semibold">
          {t("vet.documents")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("vet.documentsHint")}</p>
        <VetDocuments
          locked={locked}
          documents={p.documents.map((d) => ({
            id: d.id,
            kind: d.kind,
            createdAt: d.createdAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}

export default function VetProfilePage() {
  return (
    <Private rows={4}>
      <Profile />
    </Private>
  );
}
