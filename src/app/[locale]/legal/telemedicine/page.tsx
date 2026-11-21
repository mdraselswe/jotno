import { legalMetadata, LegalPage } from "@/components/layout/legal-page";
import { ROUTES } from "@/config/routes";

export function generateMetadata() {
  return legalMetadata("telemedicine", ROUTES.telemedicine);
}

export default function Page() {
  return <LegalPage doc="telemedicine" />;
}
