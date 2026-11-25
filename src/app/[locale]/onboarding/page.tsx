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

async function Gate({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [locale, sp] = await Promise.all([getLocale(), searchParams]);
  // Arriving from /for-vets or /join picks the role for you.
  const as = sp.as === "vet" || sp.as === "owner" ? sp.as : undefined;
  const viewer = await getViewer();
  if (!viewer)
    redirect(
      `${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(`${localeHref(locale, ROUTES.onboarding)}/${as ? `?as=${as}` : ""}`)}` as Route,
    );
  if (viewer.onboarded)
    redirect(localeHref(locale, viewer.role === "owner" ? ROUTES.account : ROUTES.dashboard));
  return <OnboardingForm defaultName={viewer.fullName ?? ""} defaultRole={as} />;
}

export default function OnboardingPage({ searchParams }: PageProps<"/[locale]/onboarding">) {
  return (
    <div className="container-page py-6 md:py-12">
      <Suspense
        fallback={
          <div
            role="status"
            className="mx-auto grid w-full max-w-lg gap-6 rounded-(--radius-3xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-8"
          >
            <div className="grid justify-items-center gap-2">
              <Skeleton className="size-24 rounded-full" />
              <Skeleton className="h-8 w-56 max-w-full" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full rounded-(--radius-2xl)" />
            <Skeleton className="h-24 w-full rounded-(--radius-2xl)" />
            <Skeleton className="h-(--control-h-lg) w-full rounded-(--control-radius)" />
          </div>
        }
      >
        <Gate searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
