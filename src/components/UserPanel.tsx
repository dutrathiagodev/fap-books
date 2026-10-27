import type { Profile } from "@/types/profile";
import { AppShell } from "./AppShell";
import { PageHeader } from "./PageHeader";

interface UserPanelProps {
  title: string;
  profile: Profile;
}

// Painel provisório de cada perfil dentro da estrutura base.
// As telas de verdade entram pelos cards de design e de blocos.
export function UserPanel({ title, profile }: UserPanelProps) {
  return (
    <AppShell profile={profile}>
      <PageHeader
        title={title}
        breadcrumbs={[{ label: "Início" }]}
        description={`Olá, ${profile.fullName}. Você entrou como ${profile.email}.`}
      />
    </AppShell>
  );
}
