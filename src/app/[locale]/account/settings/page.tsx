import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { ProfileForm } from "@/features/auth";
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
    <div className="grid gap-10">
      <PrivateHeading title={t("settings.title")} sub={t("settings.sub")} />
      <section className="grid gap-4" aria-labelledby="s-profile">
        <h2 id="s-profile" className="font-heading text-lg font-semibold">
          {t("settings.profile")}
        </h2>
        <p className="text-sm text-muted-foreground">{viewer.email}</p>
        <ProfileForm
          initial={{
            fullName: viewer.fullName ?? "",
            phone: viewer.phone ?? "",
            districtId: viewer.homeDistrictId,
            areaId: viewer.homeAreaId,
          }}
        />
      </section>
      <section className="grid gap-3" aria-labelledby="s-push">
        <h2 id="s-push" className="font-heading text-lg font-semibold">
          {t("settings.push")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("settings.pushHint")}</p>
        <PushToggle />
      </section>
      <section className="grid gap-2" aria-labelledby="s-danger">
        <h2 id="s-danger" className="font-heading text-lg font-semibold">
          {t("settings.danger")}
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground">{t("settings.dangerHint")}</p>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Private rows={2}>
      <Settings />
    </Private>
  );
}
