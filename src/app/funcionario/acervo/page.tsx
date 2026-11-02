import { Suspense } from "react";
import Link from "next/link";
import { Info, Search } from "lucide-react";
import { AppShell, BooksTable, EmptyState, LoadingState, PageHeader } from "@/components";
import { booksHref, pageNumbers, parseBookFilters, type SituationCounts } from "@/domain/books/book-rules";
import { requireRole } from "@/lib/require-role";
import { countBookSituations, listBooks } from "@/services/books.service";
import { deleteBookAction, inactivateBookAction } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FIELD =
  "h-11 rounded-md border border-line-strong bg-surface px-3 text-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus";

// Contadores ao lado do total (Figma, card 0113): a cor do ponto combina com a do status da linha.
const SITUATION_COUNTERS: { key: keyof SituationCounts; dot: string; one: string; many: string }[] = [
  { key: "available", dot: "bg-success-700", one: "disponível", many: "disponíveis" },
  { key: "unavailable", dot: "bg-info-700", one: "emprestado", many: "emprestados" },
  { key: "reserved", dot: "bg-warning-700", one: "reservado", many: "reservados" },
];

// A listagem lê quem está logado e os filtros do endereço (dados da requisição), por isso fica dentro do Suspense.
async function AcervoContent({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireRole("librarian");
  const filters = parseBookFilters(await searchParams);
  const [{ books, total, page, pageSize, categories }, situations] = await Promise.all([
    listBooks(filters),
    countBookSituations(filters),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilter = Boolean(filters.query || filters.category || filters.status !== "all");
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="Acervo de livros"
        breadcrumbs={[{ label: "Gestão bibliotecária" }, { label: "Acervo" }]}
        description="Gerencie o catálogo, os exemplares e a disponibilidade da biblioteca."
      />

      <form method="get" action="/funcionario/acervo" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm font-medium">
          Buscar
          <span className="relative">
            <Search size={16} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              name="q"
              defaultValue={filters.query}
              placeholder="Título, autor ou código"
              className={`${FIELD} w-full pl-9 font-normal`}
            />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Categoria
          <select name="categoria" defaultValue={filters.category} className={`${FIELD} font-normal`}>
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Status
          <select name="status" defaultValue={filters.status} className={`${FIELD} font-normal`}>
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </label>
        <button
          type="submit"
          className="h-11 cursor-pointer rounded-md bg-brand px-5 text-sm font-medium text-on-brand hover:bg-brand-hover"
        >
          Filtrar
        </button>
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted" role="status">
        <span>
          {total} {total === 1 ? "título cadastrado" : "títulos cadastrados"}
        </span>
        {SITUATION_COUNTERS.map(({ key, dot, one, many }) => (
          <span key={key} className="flex items-center gap-1.5">
            <span aria-hidden className={`size-2 rounded-full ${dot}`} />
            {situations[key]} {situations[key] === 1 ? one : many}
          </span>
        ))}
      </div>

      {books.length === 0 ? (
        <EmptyState
          title={hasFilter ? "Nenhum livro encontrado" : "Nenhum livro cadastrado"}
          description={
            hasFilter ? "Tente outro termo ou limpe os filtros." : "Quando houver livros no acervo, eles aparecem aqui."
          }
          action={
            hasFilter ? (
              <Link href="/funcionario/acervo" className="text-sm font-medium text-link underline">
                Limpar filtros
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <BooksTable books={books} onDelete={deleteBookAction} onInactivate={inactivateBookAction} />
          <nav aria-label="Páginas do acervo" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-ink-muted">
              Mostrando {first}-{first + books.length - 1} de {total} livros cadastrados
            </span>
            <span className="flex items-center gap-2">
              {page > 1 && (
                <Link href={booksHref({ ...filters, page: page - 1 })} className="rounded-md border border-line-strong px-3 py-1.5 hover:bg-subtle">
                  Anterior
                </Link>
              )}
              {pageNumbers(page, pages).map((item, index) =>
                item === "…" ? (
                  <span key={`gap-${index}`} aria-hidden className="px-1 text-ink-muted">
                    …
                  </span>
                ) : item === page ? (
                  <span key={item} aria-current="page" className="flex size-9 items-center justify-center rounded-md bg-brand font-medium text-on-brand">
                    {item}
                  </span>
                ) : (
                  <Link
                    key={item}
                    href={booksHref({ ...filters, page: item })}
                    aria-label={`Ir para a página ${item}`}
                    className="flex size-9 items-center justify-center rounded-md border border-line-strong hover:bg-subtle"
                  >
                    {item}
                  </Link>
                ),
              )}
              {page < pages && (
                <Link href={booksHref({ ...filters, page: page + 1 })} className="rounded-md border border-line-strong px-3 py-1.5 hover:bg-subtle">
                  Próxima
                </Link>
              )}
            </span>
          </nav>
        </>
      )}

      <aside className="mt-8 flex items-start gap-3 rounded-lg border border-line bg-surface p-4 text-sm">
        <Info size={18} aria-hidden className="mt-0.5 shrink-0 text-brand" />
        <p>
          <strong className="font-medium">Regra de exclusão.</strong>{" "}
          <span className="text-ink-muted">
            Livro com histórico de empréstimo não pode ser excluído, só inativado. A exclusão pede confirmação digitando o
            nome do livro.
          </span>
        </p>
      </aside>
    </AppShell>
  );
}

export default function AcervoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <AcervoContent searchParams={searchParams} />
    </Suspense>
  );
}
