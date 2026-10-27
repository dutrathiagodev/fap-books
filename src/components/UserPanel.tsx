import { logout } from "@/app/actions/auth";
import type { Profile } from "@/types/profile";
import { Button } from "./Button";

interface UserPanelProps {
  title: string;
  profile: Profile;
}

// Painel provisório de cada perfil: mostra quem entrou e o botão de sair.
// As telas de verdade entram pelos cards de design e de blocos.
export function UserPanel({ title, profile }: UserPanelProps) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Olá, {profile.fullName}. Você entrou como {profile.email}.
      </p>
      <form action={logout} className="max-w-xs">
        <Button type="submit" text="Sair" />
      </form>
    </main>
  );
}
