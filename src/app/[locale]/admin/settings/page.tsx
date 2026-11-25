import { Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ROUTES } from "@/config/routes";
import { AdminFormSkeleton } from "@/features/admin";
import { requireRole } from "@/features/auth/server";
import { SettingsForm } from "@/features/settings";
import { getSettings } from "@/features/settings/server";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Admin · Settings", robots: { index: false } };

async function Settings() {
  const [locale, t] = await Promise.all([getLocale(), getT()]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminSettings));
  const settings = await getSettings();
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title={t("settingsAdmin.title")} sub={t("settingsAdmin.sub")} icon={SettingsIcon} />
      <SettingsForm initial={settings} />
    </div>
  );
}

export default async function AdminSettingsPage() {
  const t = await getT();
  return (
    <SuspenseReveal fallback={<AdminFormSkeleton label={t("loading.label")} />}>
      <Settings />
    </SuspenseReveal>
  );
}
