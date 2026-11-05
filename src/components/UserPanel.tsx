import type { Profile } from "@/types/profile";
import { PageHeader } from "./PageHeader";

interface UserPanelProps {
  title: string;
  profile: Profile;
}

// Painel provisório de cada perfil (o AppShell vem do RolePage).
// As telas de verdade entram pelos cards de design e de blocos.
export function UserPanel({ title, profile }: UserPanelProps) {
  return (
    <PageHeader
      title={title}
      breadcrumbs={[{ label: "Início" }]}
      description={`Olá, ${profile.fullName}. Você entrou como ${profile.email}.`}
    />
  );
}
