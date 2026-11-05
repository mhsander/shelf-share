import { LegalDocumentScreen } from "@/components/legal-document";
import { privacyPolicy } from "@/constants/legal";

export default function PrivacyScreen() {
  return <LegalDocumentScreen document={privacyPolicy} />;
}
