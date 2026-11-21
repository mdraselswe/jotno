import { SectionLayout, type SectionLink } from "@/components/layout/section-nav";
import { ROUTES } from "@/config/routes";

const LINKS: readonly SectionLink[] = [
  { href: ROUTES.account, label: "account.home", exact: true },
  { href: ROUTES.pets, label: "account.pets" },
  { href: ROUTES.consults, label: "account.consults" },
  { href: ROUTES.appointments, label: "account.appointments" },
  { href: ROUTES.orders, label: "account.orders" },
  { href: ROUTES.settings, label: "account.settings" },
];

export default function AccountLayout({ children }: LayoutProps<"/[locale]/account">) {
  return (
    <SectionLayout links={LINKS} label="account.nav">
      {children}
    </SectionLayout>
  );
}
