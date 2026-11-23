import { PillTabs } from "@/components/layout/pill-tabs";
import { ROUTES } from "@/config/routes";
import type { MessageKey } from "@/i18n";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

const TABS: readonly { href: string; label: MessageKey; exact?: boolean }[] = [
  { href: ROUTES.adminShop, label: "shopAdmin.orders", exact: true },
  { href: ROUTES.adminProducts, label: "shopAdmin.products" },
  { href: ROUTES.adminCategories, label: "shopAdmin.categories" },
  { href: ROUTES.adminCoupons, label: "shopAdmin.coupons" },
  { href: ROUTES.adminShopReports, label: "shopAdmin.reports" },
];

async function Tabs() {
  const locale = await getLocale();
  const t = await getT();
  return (
    <PillTabs
      label={t("admin.shop")}
      tabs={TABS.map((tab) => ({
        href: localeHref(locale, tab.href),
        label: t(tab.label),
        exact: tab.exact,
      }))}
    />
  );
}

export default function AdminShopLayout({ children }: LayoutProps<"/[locale]/admin/shop">) {
  return (
    <div className="grid gap-6">
      <Tabs />
      {children}
    </div>
  );
}
