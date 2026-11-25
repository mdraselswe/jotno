import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/layout/app-ui";
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
      <PrivateHeading title={t("consult.vetListTitle")} icon={MessagesSquare} />
      {items.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title={t("chatui.list.empty")}
          body={t("chatui.list.vetEmptyBody")}
        />
      ) : (
        <ConsultList items={items} locale={locale} t={t} fmt={fmt} side="vet" />
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
