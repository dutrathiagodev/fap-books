"use client";

import { PageError } from "@/components/PageError";

// Tela de erro do balcão (empréstimo, devolução e renovação): mesma tela das outras rotas, com o título próprio.
export default function EmprestimosError(props: { error: Error; reset: () => void }) {
  return <PageError {...props} title="Não foi possível abrir o balcão" />;
}
