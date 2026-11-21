import { ConsultList } from "@/components/layout/consult-list";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ButtonLink } from "@/components/ui/button-link";
import { ROUTES } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { listOwnerConsults } from "@/features/consults/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("consult.listTitle"), t("consult.listSub"), ROUTES.consults, await getLocale());
}

async function Consults() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, ROUTES.consults));
  const items = await listOwnerConsults(viewer.id);
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("consult.listTitle")} sub={t("consult.listSub")} />
      {items.length === 0 ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-muted-foreground">{t("consult.empty")}</p>
          <ButtonLink href={localeHref(locale, ROUTES.vets)}>{t("nav.vets")}</ButtonLink>
        </div>
      ) : (
        <ConsultList items={items} locale={locale} t={t} fmt={fmt} />
      )}
    </div>
  );
}

export default function OwnerConsultsPage() {
  return (
    <Private>
      <Consults />
    </Private>
  );
}
