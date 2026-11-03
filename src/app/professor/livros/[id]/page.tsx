import { BookDetailPage } from "@/components/BookDetailPage";

export default function ProfessorLivroPage({ params }: { params: Promise<{ id: string }> }) {
  return <BookDetailPage role="teacher" basePath="/professor/livros" params={params} />;
}
