import type { Metadata } from "next";
import { BookSearchPage, type SearchParams } from "@/components/BookSearchPage";

export const metadata: Metadata = { title: "Buscar livros | FAP Books" };

export default function AlunoLivrosPage({ searchParams }: { searchParams: SearchParams }) {
  return <BookSearchPage role="student" basePath="/aluno/livros" searchParams={searchParams} editorial />;
}
