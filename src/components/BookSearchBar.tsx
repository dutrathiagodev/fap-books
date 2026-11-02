import Link from "next/link";
import { Search } from "lucide-react";
import { availabilityParam, bookSearchHref } from "@/domain/books/book-rules";
import type { BookAvailabilityFilter } from "@/types/book";

interface BookSearchBarProps {
  // Rota da pesquisa (ex.: "/aluno/livros"): a busca e os filtros apontam para ela.
  basePath: string;
  // Valores atuais, lidos do endereço pela página (parseBookFilters e parseAvailabilityFilter).
  query: string;
  category: string;
  availability: BookAvailabilityFilter;
  // Categorias que viram chips (as que existem no acervo).
  categories: string[];
  // Total de resultados da busca; sem ele a contagem não aparece.
  total?: number;
}

const STATUS_OPTIONS: Array<{ value: BookAvailabilityFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "available", label: "Disponível" },
  { value: "borrowed", label: "Emprestado" },
  { value: "reserved", label: "Reservado" },
];

const FOCUS = "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus";
const CHIP = `inline-flex h-10 items-center rounded-full border px-3 text-xs sm:h-8 ${FOCUS}`;
const CHIP_OFF = "border-line-strong bg-surface text-ink hover:bg-subtle";
const CHIP_ON = "border-brand bg-selected font-medium text-brand";
const SEGMENT = `inline-flex h-10 items-center border-r border-line-strong px-3 text-xs last:border-r-0 sm:h-8 ${FOCUS}`;
const LABEL = "w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-muted";

// Barra de busca da pesquisa de livros (Figma, card 0108): campo com botão Buscar, chips de CATEGORIA e controle
// STATUS (todos, disponível, emprestado, reservado). Só desenha: a página lê o endereço, chama o service e passa os
// valores. Sem JavaScript no cliente: a busca é um formulário GET e cada filtro é um link, então o endereço guarda
// a pesquisa e dá para copiar.
export function BookSearchBar({ basePath, query, category, availability, categories, total }: BookSearchBarProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
      <form method="get" action={basePath} role="search" aria-label="Pesquisar livros" className="flex gap-3">
        <label htmlFor="book-search" className="sr-only">
          Buscar por título, autor, ISBN ou assunto
        </label>
        <span className="relative block min-w-0 flex-1">
          <Search size={18} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            id="book-search"
            type="search"
            name="q"
            defaultValue={query}
            maxLength={80}
            placeholder="Busque por título, autor, ISBN ou assunto"
            className={`h-11 w-full rounded-md border border-line-strong bg-surface pl-10 pr-3 text-sm ${FOCUS}`}
          />
        </span>
        {/* Buscar mantém os filtros ativos; sem ?pagina=, a busca volta para a primeira página. */}
        {category && <input type="hidden" name="categoria" value={category} />}
        {availability !== "all" && <input type="hidden" name="situacao" value={availabilityParam(availability)} />}
        <button
          type="submit"
          className={`h-11 shrink-0 cursor-pointer rounded-md bg-brand px-5 text-sm font-medium text-on-brand hover:bg-brand-hover ${FOCUS}`}
        >
          Buscar
        </button>
      </form>

      <div className="flex flex-col gap-3">
        <nav aria-label="Categoria" className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className={LABEL}>Categoria</span>
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={bookSearchHref(basePath, { query, availability })}
                aria-current={category === "" ? "true" : undefined}
                className={`${CHIP} ${category === "" ? CHIP_ON : CHIP_OFF}`}
              >
                Todas
              </Link>
            </li>
            {categories.map((name) => (
              <li key={name}>
                <Link
                  href={bookSearchHref(basePath, { query, category: name, availability })}
                  aria-current={category === name ? "true" : undefined}
                  className={`${CHIP} ${category === name ? CHIP_ON : CHIP_OFF}`}
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Status" className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className={LABEL}>Status</span>
            <ul className="inline-flex overflow-hidden rounded-md border border-line-strong">
              {STATUS_OPTIONS.map((option) => {
                const active = availability === option.value;
                return (
                  <li key={option.value} className="flex">
                    <Link
                      href={bookSearchHref(basePath, { query, category, availability: option.value })}
                      aria-current={active ? "true" : undefined}
                      className={`${SEGMENT} ${active ? "bg-brand font-medium text-on-brand" : "bg-surface text-ink hover:bg-subtle"}`}
                    >
                      {option.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {total !== undefined && (
            <p className="text-xs text-ink-muted" role="status">
              {total.toLocaleString("pt-BR")} {total === 1 ? "resultado" : "resultados"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
