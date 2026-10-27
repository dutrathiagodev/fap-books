import { Suspense } from "react";
import { LoadingState, UserPanel } from "@/components";
import { requireRole } from "@/lib/require-role";

// A página lê quem está logado (dado que muda por pessoa), por isso fica dentro do Suspense.
async function ProfessorContent() {
  const profile = await requireRole("teacher");
  return <UserPanel title="Área do professor" profile={profile} />;
}

export default function ProfessorPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ProfessorContent />
    </Suspense>
  );
}
