import { ConsultList } from "@/components/layout/consult-list";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { listVetConsults } from "@/features/consults/server";
import { requireVet } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("consult.vetListTitle"), t("vet.waiting"), ROUTES.vetConsults, await getLocale());
}

async function Consults() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { viewer, provider } = await requireVet(locale, localeHref(locale, ROUTES.vetConsults));
  const items = await listVetConsults(provider.id, viewer.id);
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("consult.vetListTitle")} />
      {items.length === 0 ? (
        <p className="text-muted-foreground">{t("consult.vetEmpty")}</p>
      ) : (
        <ConsultList items={items} locale={locale} t={t} fmt={fmt} />
      )}
    </div>
  );
}

export default function VetConsultsPage() {
  return (
    <Private>
      <Consults />
    </Private>
  );
}
