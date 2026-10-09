import { Suspense } from "react";
import { UserPanel } from "@/components";
import { requireRole } from "@/lib/require-role";

// A página lê quem está logado (dado que muda por pessoa), por isso fica dentro do Suspense.
async function AlunoContent() {
  const profile = await requireRole("student");
  return <UserPanel title="Área do aluno" profile={profile} />;
}

export default function AlunoPage() {
  return (
    <Suspense fallback={<p className="p-6">Carregando...</p>}>
      <AlunoContent />
    </Suspense>
  );
}
