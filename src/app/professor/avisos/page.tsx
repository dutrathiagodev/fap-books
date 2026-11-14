import { EmailNoticesPage } from "@/components/EmailNoticesPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Avisos por e-mail | FAP Books" };

export default function AvisosPage() {
  return <EmailNoticesPage role="teacher" />;
}
