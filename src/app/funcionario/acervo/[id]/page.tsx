import { BookDetailPage } from "@/components/BookDetailPage";
import { ACERVO_PATH } from "@/domain/access/access-rules";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Detalhes do livro | FAP Books" };

export default function FuncionarioLivroPage({ params }: { params: Promise<{ id: string }> }) {
  return <BookDetailPage role="librarian" basePath={ACERVO_PATH} params={params} />;
}
