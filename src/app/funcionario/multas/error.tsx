"use client";

import { PageError } from "@/components/PageError";

// Tela de erro da rota de multas: mesma tela das outras rotas, com o título próprio.
export default function MultasError(props: { error: Error; reset: () => void }) {
  return <PageError {...props} title="Não foi possível abrir as multas" />;
}
