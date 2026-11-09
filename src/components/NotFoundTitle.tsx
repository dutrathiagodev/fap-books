"use client";

import { useEffect } from "react";

// No 404 de um livro, a aba mantinha o título da página que já tinha começado a carregar ("Detalhes do livro"),
// porque o título é enviado antes do notFound(). Aqui a aba passa a dizer a verdade (card 0240).
export function NotFoundTitle() {
  useEffect(() => {
    document.title = "Página não encontrada | FAP Books";
  }, []);
  return null;
}
