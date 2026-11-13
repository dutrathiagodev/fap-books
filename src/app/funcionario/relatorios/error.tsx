"use client";

import { PageError } from "@/components/PageError";

// Tela de erro da rota dos relatórios: mesma tela das outras rotas, com o título próprio.
export default function RelatoriosError(props: { error: Error; reset: () => void }) {
  return <PageError {...props} title="Não foi possível abrir os relatórios" />;
}
