"use client";

import { PageError } from "@/components/PageError";

// Tela de erro da rota do acervo: mesma tela das outras rotas, com o título próprio.
export default function AcervoError(props: { error: Error; reset: () => void }) {
  return <PageError {...props} title="Não foi possível abrir o acervo" />;
}
