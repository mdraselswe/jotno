import { Bell, Languages, LogOut, Settings as SettingsIcon, ShieldAlert, UserRound } from "lucide-react";
import { Suspense } from "react";
import { PageHeader, SectionCard } from "@/components/layout/app-ui";
import { LocaleSegment } from "@/components/layout/locale-switcher";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { ProfileForm, SignOutButton } from "@/features/auth";
import { requireViewer } from "@/features/auth/server";
import { PushToggle } from "@/features/notifications";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("settings.title"), t("settings.sub"), ROUTES.settings, await getLocale());
}

async function Settings() {
  const locale = await getLocale();
  const t = await getT();
  const viewer = await requireViewer(locale, localeHref(locale, ROUTES.settings));
  return (
    <div className="grid gap-6">
      <PageHeader title={t("settings.title")} sub={t("settings.sub")} icon={SettingsIcon} />
      <div className="grid max-w-3xl gap-5">
        <SectionCard
          title={t("settings.profile")}
          description={
            viewer.email ? (
              // Long emails have no spaces to wrap at on a 360px phone.
              <span className="break-all">{t("ownerui.settings.email", { email: viewer.email })}</span>
            ) : (
              t("ownerui.settings.profileHint")
            )
          }
          icon={UserRound}
        >
          <ProfileForm
            initial={{
              fullName: viewer.fullName ?? "",
              phone: viewer.phone ?? "",
              districtId: viewer.homeDistrictId,
              areaId: viewer.homeAreaId,
              avatarPath: viewer.avatarPath,
            }}
          />
        </SectionCard>

        <div className="grid gap-5 md:grid-cols-2">
          <SectionCard
            title={t("ownerui.settings.language")}
            description={t("ownerui.settings.languageHint")}
            icon={Languages}
          >
            <div className="rounded-(--radius-xl) bg-muted p-1">
              <LocaleSegment />
            </div>
          </SectionCard>

          <SectionCard title={t("settings.push")} description={t("settings.pushHint")} icon={Bell}>
            <PushToggle />
          </SectionCard>
        </div>

        <SectionCard title={t("nav.signOut")} description={t("ownerui.settings.signOutHint")} icon={LogOut}>
          <SignOutButton />
        </SectionCard>

        <SectionCard title={t("settings.danger")} icon={ShieldAlert} className="ring-destructive/20">
          <p className="max-w-xl text-sm text-pretty text-muted-foreground">{t("settings.dangerHint")}</p>
        </SectionCard>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <div className="grid max-w-3xl gap-5">
        <Skeleton className="h-96 rounded-(--radius-2xl)" />
        <div className="grid gap-5 md:grid-cols-2">
          <Skeleton className="h-36 rounded-(--radius-2xl)" />
          <Skeleton className="h-36 rounded-(--radius-2xl)" />
        </div>
        <Skeleton className="h-32 rounded-(--radius-2xl)" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <Settings />
    </Suspense>
  );
}
