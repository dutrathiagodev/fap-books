"use client";

import { PageError } from "@/components/PageError";

// Tela de erro da rota da reserva pedagógica: mesma tela das outras rotas, com o título próprio.
export default function ReservaPedagogicaError(props: { error: Error; reset: () => void }) {
  return <PageError {...props} title="Não foi possível abrir a reserva pedagógica" />;
}
