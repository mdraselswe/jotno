import type { Route } from "next";
import { ActiveLink } from "@/components/layout/active-link";
import { ROUTES } from "@/config/routes";
import type { MessageKey } from "@/i18n";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";

const TABS: readonly { href: string; label: MessageKey; exact?: boolean }[] = [
  { href: ROUTES.adminShop, label: "shopAdmin.orders", exact: true },
  { href: ROUTES.adminProducts, label: "shopAdmin.products" },
  { href: ROUTES.adminCoupons, label: "shopAdmin.coupons" },
  { href: ROUTES.adminShopReports, label: "shopAdmin.reports" },
];

async function Tabs() {
  const locale = await getLocale();
  const t = await getT();
  return (
    <nav aria-label={t("admin.shop")} className="-mx-1 overflow-x-auto print:hidden">
      <ul className="flex w-max gap-1 rounded-full bg-muted/70 p-1">
        {TABS.map((tab) => (
          <li key={tab.href}>
            <ActiveLink
              href={localeHref(locale, tab.href) as Route}
              match={tab.exact ? "exact" : "prefix"}
              className={(active) =>
                cn(
                  "block rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-(--motion-fast)",
                  active
                    ? "bg-card text-foreground shadow-(--shadow-card)"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {t(tab.label)}
            </ActiveLink>
          </li>
        ))}
      </ul>
    </nav>
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
