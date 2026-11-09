"use client";

import { PageError } from "@/components/PageError";

// Tela de erro do painel (Figma, card 0157): mesma tela das outras rotas, com o título próprio.
export default function PainelError(props: { error: Error; reset: () => void }) {
  return <PageError {...props} title="Não foi possível carregar o painel" />;
}
