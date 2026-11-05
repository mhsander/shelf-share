import { LegalDocumentScreen } from "@/components/legal-document";
import { termsOfService } from "@/constants/legal";

export default function TermsScreen() {
  return <LegalDocumentScreen document={termsOfService} />;
}
