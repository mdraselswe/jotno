import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { requireRole } from "@/features/auth/server";
import { SettingsForm } from "@/features/settings";
import { getSettings } from "@/features/settings/server";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Admin · Settings", robots: { index: false } };

async function Settings() {
  const locale = await getLocale();
  const t = await getT();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminSettings));
  const settings = await getSettings();
  return (
    <div className="grid max-w-3xl gap-6">
      <PrivateHeading title={t("settingsAdmin.title")} sub={t("settingsAdmin.sub")} />
      <SettingsForm initial={settings} />
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Private rows={5}>
      <Settings />
    </Private>
  );
}
