import { BookDetailPage } from "@/components/BookDetailPage";

export default function AlunoLivroPage({ params }: { params: Promise<{ id: string }> }) {
  return <BookDetailPage role="student" basePath="/aluno/livros" params={params} />;
}
