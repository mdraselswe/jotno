import { legalMetadata, LegalPage } from "@/components/layout/legal-page";
import { ROUTES } from "@/config/routes";

export function generateMetadata() {
  return legalMetadata("terms", ROUTES.terms);
}

export default function Page() {
  return <LegalPage doc="terms" />;
}
