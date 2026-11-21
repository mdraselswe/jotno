import { legalMetadata, LegalPage } from "@/components/layout/legal-page";
import { ROUTES } from "@/config/routes";

export function generateMetadata() {
  return legalMetadata("refund", ROUTES.refund);
}

export default function Page() {
  return <LegalPage doc="refund" />;
}
