import type { Metadata } from "next";
import { BookSearchPage, type SearchParams } from "@/components/BookSearchPage";

export const metadata: Metadata = { title: "Buscar livros | FAP Books" };

export default function ProfessorLivrosPage({ searchParams }: { searchParams: SearchParams }) {
  return <BookSearchPage role="teacher" basePath="/professor/livros" searchParams={searchParams} />;
}
