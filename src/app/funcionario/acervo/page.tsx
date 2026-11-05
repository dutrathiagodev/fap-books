import Link from "next/link";
import { Info, Search } from "lucide-react";
import { BooksTable, EmptyState, FilterMenu, PageHeader, Pagination, TextField, TextLink } from "@/components";
import { RolePage } from "@/components/RolePage";
import { booksHref, parseBookFilters, type SituationCounts } from "@/domain/books/book-rules";
import { countBookSituations, listBooks } from "@/services/books.service";
import { deleteBookAction, inactivateBookAction } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
] as const;

// Contadores ao lado do total (Figma, card 0113): a cor do ponto combina com a do status da linha.
const SITUATION_COUNTERS: { key: keyof SituationCounts; dot: string; one: string; many: string }[] = [
  { key: "available", dot: "bg-success-700", one: "disponível", many: "disponíveis" },
  { key: "unavailable", dot: "bg-info-700", one: "emprestado", many: "emprestados" },
  { key: "reserved", dot: "bg-warning-700", one: "reservado", many: "reservados" },
];

// A listagem lê os filtros do endereço (dado da requisição), por isso roda dentro do Suspense do RolePage.
async function AcervoContent({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseBookFilters(await searchParams);
  const [{ books, total, page, pageSize, categories }, situations] = await Promise.all([
    listBooks(filters),
    countBookSituations(filters),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilter = Boolean(filters.query || filters.category || filters.status !== "all");
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;

  return (
    <>
      <PageHeader
        title="Acervo de livros"
        breadcrumbs={[{ label: "Gestão bibliotecária" }, { label: "Acervo" }]}
        description="Gerencie o catálogo, os exemplares e a disponibilidade da biblioteca."
        action={
          <Link
            href="/funcionario/acervo/novo"
            className="inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand hover:bg-brand-hover"
          >
            Novo livro
          </Link>
        }
      />

      <form method="get" action="/funcionario/acervo" className="mb-4 flex flex-wrap items-end gap-3">
        {/* Buscar (ou Enter no campo) mantém a categoria e o status escolhidos. */}
        {filters.category && <input type="hidden" name="categoria" value={filters.category} />}
        {filters.status !== "all" && <input type="hidden" name="status" value={filters.status} />}
        <TextField
          id="acervo-busca"
          name="q"
          label="Buscar"
          type="search"
          defaultValue={filters.query}
          placeholder="Título, autor ou código"
          leadingIcon={Search}
          className="min-w-60 flex-1"
        />
        <FilterMenu
          label="Categoria"
          value={filters.category || "Todas as categorias"}
          options={[
            { label: "Todas as categorias", category: "" },
            ...categories.map((category) => ({ label: category, category })),
          ].map((option) => ({
            label: option.label,
            href: booksHref({ ...filters, category: option.category, page: 1 }),
            active: filters.category === option.category,
          }))}
        />
        <FilterMenu
          label="Status"
          value={STATUS_OPTIONS.find((option) => option.value === filters.status)?.label ?? "Todos os status"}
          options={STATUS_OPTIONS.map((option) => ({
            label: option.label,
            href: booksHref({ ...filters, status: option.value, page: 1 }),
            active: filters.status === option.value,
          }))}
        />
        <button
          type="submit"
          className="h-11 cursor-pointer rounded-md bg-brand px-5 text-sm font-medium text-on-brand hover:bg-brand-hover"
        >
          Buscar
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
              <TextLink href="/funcionario/acervo">Limpar filtros</TextLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <BooksTable books={books} onDelete={deleteBookAction} onInactivate={inactivateBookAction} />
          <Pagination
            page={page}
            pages={pages}
            summary={`Mostrando ${first}-${first + books.length - 1} de ${total} livros cadastrados`}
            label="Páginas do acervo"
            hrefFor={(target) => booksHref({ ...filters, page: target })}
          />
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
    </>
  );
}

export default function AcervoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <RolePage role="librarian">{() => <AcervoContent searchParams={searchParams} />}</RolePage>
  );
}
