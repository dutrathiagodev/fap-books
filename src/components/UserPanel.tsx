import type { Profile } from "@/types/profile";
import { AppShell } from "./AppShell";

interface UserPanelProps {
  title: string;
  profile: Profile;
}

// Painel provisório de cada perfil dentro da estrutura base.
// As telas de verdade entram pelos cards de design e de blocos.
export function UserPanel({ title, profile }: UserPanelProps) {
  return (
    <AppShell profile={profile} title={title}>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 className="text-h2">{title}</h1>
        <p className="text-base text-ink-muted">
          Olá, {profile.fullName}. Você entrou como {profile.email}.
        </p>
      </div>
    </AppShell>
  );
}
