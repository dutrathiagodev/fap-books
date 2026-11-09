"use client";

import { PageError } from "@/components/PageError";

// Tela de erro do cadastro de usuário.
export default function CadastroUsuarioError(props: { error: Error; reset: () => void }) {
  return <PageError {...props} title="Não foi possível abrir o cadastro de usuário" />;
}
