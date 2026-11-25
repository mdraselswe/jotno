import { MessagesSquare, Stethoscope } from "lucide-react";
import { EmptyState } from "@/components/layout/app-ui";
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
  const findVet = (
    <ButtonLink href={localeHref(locale, ROUTES.vets)} variant="brand">
      <Stethoscope aria-hidden="true" />
      {t("nav.vets")}
    </ButtonLink>
  );
  return (
    <div className="grid gap-6">
      <PrivateHeading
        title={t("consult.listTitle")}
        sub={t("consult.listSub")}
        icon={MessagesSquare}
        action={items.length > 0 ? findVet : undefined}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title={t("chatui.list.empty")}
          body={t("chatui.list.emptyBody")}
          action={findVet}
        />
      ) : (
        <ConsultList items={items} locale={locale} t={t} fmt={fmt} side="owner" />
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
