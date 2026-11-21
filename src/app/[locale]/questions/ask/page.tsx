import type { Route } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { getViewer } from "@/features/auth/server";
import { AskForm } from "@/features/questions";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { robots: { index: false } };

async function Ask() {
  const locale = await getLocale();
  const t = await getT();
  const viewer = await getViewer();
  if (!viewer) {
    const here = localeHref(locale, ROUTES.ask);
    return (
      <div className="grid justify-items-start gap-3">
        <p className="text-muted-foreground">{t("qa.signIn")}</p>
        <ButtonLink href={`${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(here)}` as Route}>
          {t("consult.signIn")}
        </ButtonLink>
      </div>
    );
  }
  return <AskForm />;
}

export default async function AskPage() {
  const t = await getT();
  return (
    <div className="container-page grid max-w-2xl gap-6 py-8 md:py-12">
      <header className="grid gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{t("qa.ask")}</h1>
        <p className="text-muted-foreground">{t("qa.askSub")}</p>
      </header>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Ask />
      </Suspense>
    </div>
  );
}
