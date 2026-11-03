import { BookSearchPage, type SearchParams } from "@/components/BookSearchPage";

export default function AlunoLivrosPage({ searchParams }: { searchParams: SearchParams }) {
  return <BookSearchPage role="student" basePath="/aluno/livros" searchParams={searchParams} />;
}
