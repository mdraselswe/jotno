import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { VetDocuments, VetProfileForm, vetProfileValues } from "@/features/providers";
import { requireVet } from "@/features/providers/server";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("vet.profile"), t("vet.completenessHint"), ROUTES.vetProfile, await getLocale());
}

async function Profile() {
  const locale = await getLocale();
  const t = await getT();
  const { provider: p } = await requireVet(locale, localeHref(locale, ROUTES.vetProfile));
  const locked = p.status === "pending";
  return (
    <div className="grid gap-8">
      <PrivateHeading title={t("vet.profile")} sub={t("vet.completenessHint")} />
      <VetProfileForm initial={vetProfileValues(p)} />
      <section
        className="glow-border relative grid max-w-3xl gap-3 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card)"
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
