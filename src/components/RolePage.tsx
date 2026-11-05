import { Suspense, type ReactNode } from "react";
import { requireRole } from "@/lib/require-role";
import type { Profile, UserRole } from "@/types/profile";
import { AppShell } from "./AppShell";
import { LoadingState } from "./LoadingState";

interface RolePageProps {
  // Quem pode abrir: a conferência é feita aqui no servidor (quem não pode é redirecionado), além do proxy.ts.
  role: UserRole;
  // Monta o conteúdo da página já com o perfil conferido. Pode buscar dados (async).
  children: (profile: Profile) => ReactNode | Promise<ReactNode>;
}

async function RoleContent({ role, children }: RolePageProps) {
  const profile = await requireRole(role);
  const content = await children(profile);
  return <AppShell profile={profile}>{content}</AppShell>;
}

// Esqueleto das telas logadas: lê quem está logado (dado que muda por pessoa), por isso fica dentro do Suspense,
// confere o perfil e põe o conteúdo no AppShell. Não entra no index porque usa código só de servidor.
export function RolePage({ role, children }: RolePageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <RoleContent role={role}>{children}</RoleContent>
    </Suspense>
  );
}
