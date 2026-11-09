"use client";

import { PageError } from "@/components/PageError";

// Tela de erro do cadastro e da importação de livros.
export default function CadastroLivroError(props: { error: Error; reset: () => void }) {
  return <PageError {...props} title="Não foi possível abrir o cadastro de livro" />;
}
