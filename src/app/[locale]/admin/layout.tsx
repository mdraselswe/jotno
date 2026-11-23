import { SectionLayout, type SectionLink } from "@/components/layout/section-nav";
import { ROUTES } from "@/config/routes";

const LINKS: readonly SectionLink[] = [
  { href: ROUTES.admin, label: "admin.home", exact: true },
  { href: ROUTES.adminUsers, label: "manage.users" },
  { href: ROUTES.adminVets, label: "admin.vets" },
  { href: ROUTES.adminConsults, label: "monitor.title" },
  { href: ROUTES.adminFeatured, label: "admin.featured" },
  { href: ROUTES.adminPayments, label: "payAdmin.title" },
  { href: ROUTES.adminPayouts, label: "admin.payouts" },
  { href: ROUTES.adminAppointments, label: "manage.appointments" },
  { href: ROUTES.adminArticles, label: "manage.articles" },
  { href: ROUTES.adminReports, label: "admin.reports" },
  { href: ROUTES.adminShop, label: "admin.shop" },
  { href: ROUTES.adminSettings, label: "settingsAdmin.title" },
  { href: ROUTES.adminAudit, label: "admin.audit" },
];

export default function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  return (
    <SectionLayout links={LINKS} label="admin.nav">
      {children}
    </SectionLayout>
  );
}
