import { bookSearchHref, parseAvailabilityFilter, parseBookFilters, parseBookSort } from "@/domain/books/book-rules";
import { formatNumber } from "@/domain/format";
import { listNewArrivals, searchBooks } from "@/services/books.service";
import type { UserRole } from "@/types/profile";
import { BookCatalogCard } from "./BookCatalogCard";
import { BookResultCard } from "./BookResultCard";
import { BookSearchBar } from "./BookSearchBar";
import { EmptyState } from "./EmptyState";
import { NewArrivals } from "./NewArrivals";
import { PageHeader } from "./PageHeader";
import { Pagination } from "./Pagination";
import { RolePage } from "./RolePage";
import { StudentSearchHero } from "./StudentSearchHero";
import { TextLink } from "./TextLink";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface BookSearchPageProps {
  // Quem pode abrir: a conferência de perfil é feita no servidor (RolePage), além do proxy.ts.
  role: Exclude<UserRole, "librarian">;
  // Endereço desta página (ex.: "/aluno/livros"): a busca, os filtros e a paginação apontam para ele.
  basePath: string;
  searchParams: SearchParams;
  // Visual editorial do aluno (Figma, card 0108): topo com busca e destaque, novidades e cartões com capa grande.
  // Professor e funcionário ficam no painel corporativo.
  editorial?: boolean;
}

// Pesquisa de livros de alunos e professores (Figma, card 0108). Lê o endereço (dado da requisição), por isso
// roda dentro do Suspense do RolePage. Todo valor do endereço passa por uma leitura que limpa ou usa lista.
export function BookSearchPage({ role, basePath, searchParams, editorial = false }: BookSearchPageProps) {
  return (
    <RolePage role={role}>
      {async () => {
        const params = await searchParams;
        const filters = parseBookFilters(params);
        const availability = parseAvailabilityFilter(params);
        const sort = parseBookSort(params);
        const { books, total, page, pageSize, categories } = await searchBooks(filters, availability, sort);
        const pages = Math.max(1, Math.ceil(total / pageSize));
        const first = (page - 1) * pageSize + 1;

        // Destaque e novidades só no visual editorial. As novidades somem quando há busca, filtro ou outra página.
        const arrivals = editorial ? await listNewArrivals(5) : [];
        const featured = arrivals[0] ?? null;
        const isStart = !filters.query && !filters.category && availability === "all" && page === 1;

        return (
          <>
            {editorial ? (
              <>
                <StudentSearchHero
                  basePath={basePath}
                  query={filters.query}
                  category={filters.category}
                  availability={availability}
                  sort={sort}
                  featured={featured}
                />
                {isStart && <NewArrivals books={arrivals.slice(1)} basePath={basePath} />}
                <h2 className="mb-4 font-heading text-2xl font-bold">Todo o acervo</h2>
              </>
            ) : (
              <PageHeader
                title="Buscar livros"
                breadcrumbs={[{ label: "Início" }, { label: "Buscar livros" }]}
                description="Consulte o acervo da biblioteca da FAP."
              />
            )}
            <BookSearchBar
              basePath={basePath}
              query={filters.query}
              category={filters.category}
              availability={availability}
              sort={sort}
              categories={categories}
              total={total}
              hideSearch={editorial}
            />

            {books.length === 0 ? (
              <EmptyState
                title="Nenhum livro encontrado"
                description="Tente outro título ou autor."
                action={<TextLink href={basePath}>Limpar busca</TextLink>}
              />
            ) : (
              <>
                <ul
                  className={
                    editorial
                      ? "grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4"
                      : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                  }
                >
                  {books.map((book) => (
                    <li key={book.id}>
                      {editorial ? (
                        <BookCatalogCard book={book} basePath={basePath} />
                      ) : (
                        <BookResultCard book={book} basePath={basePath} />
                      )}
                    </li>
                  ))}
                </ul>
                <Pagination
                  page={page}
                  pages={pages}
                  summary={`Mostrando ${first}-${first + books.length - 1} de ${formatNumber(total)} livros`}
                  label="Páginas da pesquisa"
                  hrefFor={(target) =>
                    bookSearchHref(basePath, {
                      query: filters.query,
                      category: filters.category,
                      availability,
                      sort,
                      page: target,
                    })
                  }
                />
              </>
            )}
          </>
        );
      }}
    </RolePage>
  );
}
