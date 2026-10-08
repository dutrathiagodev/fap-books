import { Suspense } from "react";
import { UserPanel } from "@/components";
import { requireRole } from "@/lib/require-role";

// A página lê quem está logado (dado que muda por pessoa), por isso fica dentro do Suspense.
async function FuncionarioContent() {
  const profile = await requireRole("librarian");
  return <UserPanel title="Área da funcionária" profile={profile} />;
}

export default function FuncionarioPage() {
  return (
    <Suspense fallback={<p className="p-6">Carregando...</p>}>
      <FuncionarioContent />
    </Suspense>
  );
}
