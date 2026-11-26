import { SectionLayout, type SectionLink } from "@/components/layout/section-nav";
import { ROUTES } from "@/config/routes";

const LINKS: readonly SectionLink[] = [
  { href: ROUTES.admin, label: "admin.home", icon: "gauge", exact: true },
  { href: ROUTES.adminConsults, label: "monitor.title", icon: "chats", group: "section.group.work" },
  { href: ROUTES.adminReports, label: "admin.reports", icon: "reports" },
  { href: ROUTES.adminAppointments, label: "manage.appointments", icon: "calendar" },
  { href: ROUTES.adminUsers, label: "manage.users", icon: "users", group: "section.group.people" },
  { href: ROUTES.adminVets, label: "admin.vets", icon: "vets" },
  { href: ROUTES.adminBvc, label: "adminui.bvc.title", icon: "verified" },
  { href: ROUTES.adminFeatured, label: "admin.featured", icon: "featured" },
  { href: ROUTES.adminReferrals, label: "grow.nav.referrals", icon: "invite" },
  { href: ROUTES.adminPayments, label: "payAdmin.title", icon: "payments", group: "section.group.money" },
  { href: ROUTES.adminPayouts, label: "admin.payouts", icon: "payouts" },
  { href: ROUTES.adminShop, label: "admin.shop", icon: "shop", group: "section.group.content" },
  { href: ROUTES.adminArticles, label: "manage.articles", icon: "articles" },
  {
    href: ROUTES.adminSettings,
    label: "settingsAdmin.title",
    icon: "settings",
    group: "section.group.system",
  },
  { href: ROUTES.adminAudit, label: "admin.audit", icon: "audit" },
];

export default function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  return (
    <SectionLayout links={LINKS} label="admin.nav" title="section.admin" titleIcon="shield">
      {children}
    </SectionLayout>
  );
}
