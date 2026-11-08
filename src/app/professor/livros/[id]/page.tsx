import type { Metadata } from "next";
import { BookDetailPage } from "@/components/BookDetailPage";

export const metadata: Metadata = { title: "Detalhe do livro | FAP Books" };

export default function ProfessorLivroPage({ params }: { params: Promise<{ id: string }> }) {
  return <BookDetailPage role="teacher" basePath="/professor/livros" params={params} />;
}
