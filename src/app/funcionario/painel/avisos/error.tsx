"use client";

import { PageError } from "@/components/PageError";

// Tela de erro dos avisos de prazo (Figma, card 0147).
export default function AvisosError(props: { error: Error; reset: () => void }) {
  return <PageError {...props} title="Não foi possível carregar os avisos de prazo" />;
}
