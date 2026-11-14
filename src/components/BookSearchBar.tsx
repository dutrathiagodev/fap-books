import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { bookSearchHref, type BookSort } from "@/domain/books/book-rules";
import { formatNumber, plural } from "@/domain/format";
import type { BookAvailabilityFilter } from "@/types/book";
import { TextField } from "./TextField";

interface BookSearchBarProps {
  // Rota da pesquisa (ex.: "/aluno/livros"): a busca e os filtros apontam para ela.
  basePath: string;
  // Valores atuais, lidos do endereço pela página (parseBookFilters e parseAvailabilityFilter).
  query: string;
  category: string;
  availability: BookAvailabilityFilter;
  sort: BookSort;
  // Categorias que viram chips (as que existem no acervo).
  categories: string[];
  // Total de resultados da busca; sem ele a contagem não aparece.
  total?: number;
  // No visual editorial do aluno a busca mora no topo da página: aqui ficam só os filtros, sem o cartão em volta.
  hideSearch?: boolean;
}

const STATUS_OPTIONS: Array<{ value: BookAvailabilityFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "available", label: "Disponível" },
  { value: "unavailable", label: "Emprestado" },
  { value: "reserved", label: "Reservado" },
];

const SORT_OPTIONS: Array<{ value: BookSort; label: string }> = [
  { value: "relevance", label: "Mais relevantes" },
  { value: "title", label: "Título (A–Z)" },
  { value: "author", label: "Autor (A–Z)" },
  { value: "available", label: "Disponíveis primeiro" },
];

const FOCUS = "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus";
const CHIP = `inline-flex h-10 items-center rounded-full border px-3 text-xs sm:h-8 ${FOCUS}`;
const CHIP_OFF = "border-line-strong bg-surface text-ink hover:bg-subtle";
const CHIP_ON = "border-brand bg-selected font-medium text-brand-ink";
const SEGMENT = `inline-flex h-10 items-center border-r border-line-strong px-3 text-xs last:border-r-0 sm:h-8 ${FOCUS}`;
const LABEL = "w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-muted";

// Barra de busca da pesquisa de livros (Figma, card 0108): campo com botão Buscar, chips de CATEGORIA e controle
// STATUS (todos, disponível, emprestado, reservado). Só desenha: a página lê o endereço, chama o service e passa os
// valores. Sem JavaScript no cliente: a busca é um formulário GET e cada filtro é um link, então o endereço guarda
// a pesquisa e dá para copiar.
export function BookSearchBar({ basePath, query, category, availability, sort, categories, total, hideSearch = false }: BookSearchBarProps) {
  return (
    <div className={`mb-6 flex flex-col gap-4 ${hideSearch ? "" : "rounded-lg border border-line bg-surface p-4"}`}>
      {!hideSearch && (
        <form method="get" action={basePath} role="search" aria-label="Pesquisar livros" className="flex gap-3">
          <div className="min-w-0 flex-1">
            <TextField
              id="book-search"
              name="q"
              label="Buscar por título, autor, ISBN ou assunto"
              hideLabel
              type="search"
              defaultValue={query}
              maxLength={80}
              placeholder="Busque por título, autor, ISBN ou assunto"
              leadingIcon={Search}
            />
          </div>
          {/* Buscar mantém os filtros ativos; sem ?pagina=, a busca volta para a primeira página. */}
          {category && <input type="hidden" name="categoria" value={category} />}
          {availability !== "all" && <input type="hidden" name="situacao" value={availability} />}
          {sort !== "relevance" && <input type="hidden" name="ordem" value={sort} />}
          <button
            type="submit"
            className={`h-11 shrink-0 cursor-pointer md:h-10 rounded-md bg-brand px-5 text-sm font-medium text-on-brand hover:bg-brand-hover ${FOCUS}`}
          >
            Buscar
          </button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        <nav aria-label="Categoria" className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className={LABEL}>Categoria</span>
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={bookSearchHref(basePath, { query, availability, sort })}
                aria-current={category === "" ? "true" : undefined}
                className={`${CHIP} ${category === "" ? CHIP_ON : CHIP_OFF}`}
              >
                Todas
              </Link>
            </li>
            {categories.map((name) => (
              <li key={name}>
                <Link
                  href={bookSearchHref(basePath, { query, category: name, availability, sort })}
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
                      href={bookSearchHref(basePath, { query, category, availability: option.value, sort })}
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
          <div className="flex items-center gap-3">
            {total !== undefined && (
              <p className="text-xs text-ink-muted" role="status">
                {formatNumber(total)} {plural(total, "resultado", "resultados")}
              </p>
            )}
            <details className="relative">
              <summary className={`flex h-11 cursor-pointer list-none md:h-8 items-center gap-2 rounded-md border border-line-strong px-3 text-xs ${FOCUS}`}>
                <span className="sr-only">Ordenar por: </span>
                {SORT_OPTIONS.find((option) => option.value === sort)?.label}
                <ChevronDown size={14} aria-hidden />
              </summary>
              <ul className="absolute right-0 z-10 mt-1 w-48 rounded-md border border-line bg-surface p-1 shadow-md">
                {SORT_OPTIONS.map((option) => (
                  <li key={option.value}>
                    <Link
                      href={bookSearchHref(basePath, { query, category, availability, sort: option.value })}
                      aria-current={option.value === sort ? "true" : undefined}
                      className={`block rounded px-3 py-2 text-xs hover:bg-subtle ${FOCUS} ${option.value === sort ? "font-medium text-brand" : ""}`}
                    >
                      {option.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
