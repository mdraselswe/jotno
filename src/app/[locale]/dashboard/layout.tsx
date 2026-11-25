import { SectionLayout, type SectionLink } from "@/components/layout/section-nav";
import { ROUTES } from "@/config/routes";

const LINKS: readonly SectionLink[] = [
  { href: ROUTES.dashboard, label: "vet.home", icon: "overview", exact: true },
  { href: ROUTES.vetConsults, label: "vet.consults", icon: "chats", group: "section.group.work" },
  { href: ROUTES.vetQuestions, label: "vet.questions", icon: "questions" },
  { href: ROUTES.vetAppointments, label: "vet.appointments", icon: "calendar" },
  { href: ROUTES.vetSchedule, label: "vet.schedule", icon: "schedule" },
  { href: ROUTES.vetEarnings, label: "vet.earnings", icon: "earnings", group: "section.group.grow" },
  { href: ROUTES.vetArticles, label: "vet.articles", icon: "articles" },
  { href: ROUTES.vetFeatured, label: "vet.featured", icon: "featured" },
  { href: ROUTES.vetProfile, label: "vet.profile", icon: "profile", group: "section.group.setup" },
];

export default function DashboardLayout({ children }: LayoutProps<"/[locale]/dashboard">) {
  return (
    <SectionLayout links={LINKS} label="vet.nav" title="section.vet" titleIcon="vets">
      {children}
    </SectionLayout>
  );
}
