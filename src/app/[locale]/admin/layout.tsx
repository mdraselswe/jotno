import { SectionLayout, type SectionLink } from "@/components/layout/section-nav";
import { ROUTES } from "@/config/routes";

const LINKS: readonly SectionLink[] = [
  { href: ROUTES.admin, label: "admin.home", exact: true },
  { href: ROUTES.adminVets, label: "admin.vets" },
  { href: ROUTES.adminFeatured, label: "admin.featured" },
  { href: ROUTES.adminPayouts, label: "admin.payouts" },
  { href: ROUTES.adminReports, label: "admin.reports" },
  { href: ROUTES.adminShop, label: "admin.shop" },
  { href: ROUTES.adminAudit, label: "admin.audit" },
];

export default function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  return (
    <SectionLayout links={LINKS} label="admin.nav">
      {children}
    </SectionLayout>
  );
}
