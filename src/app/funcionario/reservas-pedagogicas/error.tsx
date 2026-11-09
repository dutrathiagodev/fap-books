"use client";

import { PageError } from "@/components/PageError";

// Tela de erro da rota das reservas pedagógicas: mesma tela das outras rotas, com o título próprio.
export default function ReservasPedagogicasError(props: { error: Error; reset: () => void }) {
  return <PageError {...props} title="Não foi possível abrir as reservas pedagógicas" />;
}
