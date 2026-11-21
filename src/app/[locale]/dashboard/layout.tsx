import { SectionLayout, type SectionLink } from "@/components/layout/section-nav";
import { ROUTES } from "@/config/routes";

const LINKS: readonly SectionLink[] = [
  { href: ROUTES.dashboard, label: "vet.home", exact: true },
  { href: ROUTES.vetProfile, label: "vet.profile" },
  { href: ROUTES.vetConsults, label: "vet.consults" },
  { href: ROUTES.vetQuestions, label: "vet.questions" },
  { href: ROUTES.vetSchedule, label: "vet.schedule" },
  { href: ROUTES.vetAppointments, label: "vet.appointments" },
  { href: ROUTES.vetEarnings, label: "vet.earnings" },
  { href: ROUTES.vetArticles, label: "vet.articles" },
  { href: ROUTES.vetFeatured, label: "vet.featured" },
];

export default function DashboardLayout({ children }: LayoutProps<"/[locale]/dashboard">) {
  return (
    <SectionLayout links={LINKS} label="vet.nav">
      {children}
    </SectionLayout>
  );
}
