"use client";

import { PageError } from "@/components/PageError";

// Tela de erro da rota de usuários: mesma tela das outras rotas, com o título próprio (Figma: "Tentar novamente").
export default function UsuariosError(props: { error: Error; reset: () => void }) {
  return <PageError {...props} title="Não foi possível carregar os usuários" />;
}
