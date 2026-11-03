import { Suspense } from "react";
import Link from "next/link";
import { bookSearchHref, parseAvailabilityFilter, parseBookFilters, parseBookSort } from "@/domain/books/book-rules";
import { requireRole } from "@/lib/require-role";
import { searchBooks } from "@/services/books.service";
import type { UserRole } from "@/types/profile";
import { AppShell } from "./AppShell";
import { BookResultCard } from "./BookResultCard";
import { BookSearchBar } from "./BookSearchBar";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import { PageHeader } from "./PageHeader";
import { Pagination } from "./Pagination";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface BookSearchPageProps {
  // Quem pode abrir: a conferência de perfil é feita aqui no servidor, além do proxy.ts.
  role: Exclude<UserRole, "librarian">;
  // Endereço desta página (ex.: "/aluno/livros"): a busca, os filtros e a paginação apontam para ele.
  basePath: string;
  searchParams: SearchParams;
}

// Pesquisa de livros de alunos e professores (Figma, card 0108). Lê quem está logado e o endereço (dados da
// requisição), por isso fica dentro do Suspense. Todo valor do endereço passa por uma leitura que limpa ou usa lista.
async function BookSearchContent({ role, basePath, searchParams }: BookSearchPageProps) {
  const profile = await requireRole(role);
  const params = await searchParams;
  const filters = parseBookFilters(params);
  const availability = parseAvailabilityFilter(params);
  const sort = parseBookSort(params);
  const { books, total, page, pageSize, categories } = await searchBooks(filters, availability, sort);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = (page - 1) * pageSize + 1;

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="Buscar livros"
        breadcrumbs={[{ label: "Início" }, { label: "Buscar livros" }]}
        description="Consulte o acervo da biblioteca da FAP."
      />
      <BookSearchBar
        basePath={basePath}
        query={filters.query}
        category={filters.category}
        availability={availability}
        sort={sort}
        categories={categories}
        total={total}
      />

      {books.length === 0 ? (
        <EmptyState
          title="Nenhum livro encontrado"
          description="Tente outro título ou autor."
          action={
            <Link href={basePath} className="text-sm font-medium text-link underline">
              Limpar busca
            </Link>
          }
        />
      ) : (
        <>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <li key={book.id}>
                <BookResultCard book={book} />
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pages={pages}
            summary={`Mostrando ${first}-${first + books.length - 1} de ${total.toLocaleString("pt-BR")} livros`}
            label="Páginas da pesquisa"
            hrefFor={(target) =>
              bookSearchHref(basePath, { query: filters.query, category: filters.category, availability, sort, page: target })
            }
          />
        </>
      )}
    </AppShell>
  );
}

export function BookSearchPage(props: BookSearchPageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <BookSearchContent {...props} />
    </Suspense>
  );
}
