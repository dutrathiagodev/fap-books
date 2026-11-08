"use client";

import { PageError } from "@/components/PageError";

// Tela de erro da rota do histórico: mesma tela das outras rotas, com o título próprio.
export default function HistoricoError(props: { error: Error; reset: () => void }) {
  return <PageError {...props} title="Não foi possível abrir o histórico" />;
}
