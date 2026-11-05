import { BookDetailPage } from "@/components/BookDetailPage";
import { ACERVO_PATH } from "@/domain/access/access-rules";

export default function FuncionarioLivroPage({ params }: { params: Promise<{ id: string }> }) {
  return <BookDetailPage role="librarian" basePath={ACERVO_PATH} params={params} />;
}
