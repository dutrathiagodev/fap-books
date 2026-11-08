import type { Metadata } from "next";
import { BookDetailPage } from "@/components/BookDetailPage";

export const metadata: Metadata = { title: "Detalhe do livro | FAP Books" };

export default function AlunoLivroPage({ params }: { params: Promise<{ id: string }> }) {
  return <BookDetailPage role="student" basePath="/aluno/livros" params={params} />;
}
