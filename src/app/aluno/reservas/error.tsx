"use client";

import { PageError } from "@/components/PageError";

// Tela de erro desta rota da Área do aluno: mesma tela das outras, com o título próprio.
export default function ReservasError(props: { error: Error; reset: () => void }) {
  return <PageError {...props} title="Não foi possível abrir suas reservas" />;
}
