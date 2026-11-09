"use client";

import { PageError } from "@/components/PageError";

// Rede de segurança: qualquer rota sem tela de erro própria cai aqui, em português, em vez da tela padrão do Next.
export default function AppError(props: { error: Error; reset: () => void }) {
  return <PageError {...props} title="Algo deu errado" />;
}
