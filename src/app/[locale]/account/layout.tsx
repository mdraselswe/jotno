import { SectionLayout, type SectionLink } from "@/components/layout/section-nav";
import { ROUTES } from "@/config/routes";

const LINKS: readonly SectionLink[] = [
  { href: ROUTES.account, label: "account.home", icon: "overview", exact: true },
  { href: ROUTES.pets, label: "account.pets", icon: "pets" },
  { href: ROUTES.consults, label: "account.consults", icon: "chats" },
  { href: ROUTES.appointments, label: "account.appointments", icon: "calendar" },
  { href: ROUTES.orders, label: "account.orders", icon: "orders" },
  { href: ROUTES.settings, label: "account.settings", icon: "settings" },
];

export default function AccountLayout({ children }: LayoutProps<"/[locale]/account">) {
  return (
    <SectionLayout links={LINKS} label="account.nav" title="section.account" titleIcon="profile">
      {children}
    </SectionLayout>
  );
}
