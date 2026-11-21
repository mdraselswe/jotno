import type { Route } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { OnboardingForm } from "@/features/auth";
import { getViewer } from "@/features/auth/server";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return {
    ...pageMetadata(t("onboarding.title"), t("onboarding.sub"), ROUTES.onboarding, await getLocale()),
    robots: { index: false },
  };
}

async function Gate() {
  const locale = await getLocale();
  const viewer = await getViewer();
  if (!viewer)
    redirect(
      `${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(localeHref(locale, ROUTES.onboarding))}` as Route,
    );
  if (viewer.onboarded)
    redirect(localeHref(locale, viewer.role === "owner" ? ROUTES.account : ROUTES.dashboard));
  return <OnboardingForm defaultName={viewer.fullName ?? ""} />;
}

export default function OnboardingPage() {
  return (
    <div className="container-page py-12">
      <Suspense fallback={<Skeleton className="mx-auto h-[36rem] w-full max-w-lg" />}>
        <Gate />
      </Suspense>
    </div>
  );
}
