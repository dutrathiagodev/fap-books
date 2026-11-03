import { BookSearchPage, type SearchParams } from "@/components/BookSearchPage";

export default function ProfessorLivrosPage({ searchParams }: { searchParams: SearchParams }) {
  return <BookSearchPage role="teacher" basePath="/professor/livros" searchParams={searchParams} />;
}
