import Link from "next/link";
import { Search } from "lucide-react";
import { bookSearchHref } from "@/domain/books/book-rules";

interface BookSearchBarProps {
  // Rota da pesquisa (ex.: "/aluno/livros"): a busca e os chips apontam para ela.
  basePath: string;
  // Valores atuais, lidos do endereço pela página (parseBookFilters e parseOnlyAvailable).
  query: string;
  category: string;
  onlyAvailable: boolean;
  // Categorias que viram chips (as que existem no acervo).
  categories: string[];
}

const CHIP =
  "inline-flex h-10 items-center rounded-full border px-4 text-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus";
const CHIP_OFF = "border-line-strong bg-surface text-ink hover:bg-subtle";
const CHIP_ON = "border-brand bg-selected font-medium text-brand";

// Barra de busca da pesquisa de livros (Figma, card 0108): campo grande e chips de categoria e de disponibilidade.
// Só desenha: a página lê o endereço, chama o service e passa os valores. Sem JavaScript no cliente: a busca é um
// formulário GET e cada chip é um link, então o endereço guarda a pesquisa e dá para copiar.
export function BookSearchBar({ basePath, query, category, onlyAvailable, categories }: BookSearchBarProps) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      <form method="get" action={basePath} role="search" aria-label="Pesquisar livros">
        <label htmlFor="book-search" className="sr-only">
          Buscar por título ou autor
        </label>
        <span className="relative block">
          <Search size={18} aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            id="book-search"
            type="search"
            name="q"
            defaultValue={query}
            maxLength={80}
            placeholder="Digite o título ou autor…"
            className="h-12 w-full rounded-md border border-line-strong bg-surface pl-11 pr-4 text-base outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus"
          />
        </span>
        {/* Buscar mantém os chips ativos; sem ?pagina=, a busca volta para a primeira página. */}
        {category && <input type="hidden" name="categoria" value={category} />}
        {onlyAvailable && <input type="hidden" name="disponiveis" value="1" />}
        <button type="submit" className="sr-only">
          Buscar
        </button>
      </form>

      <nav aria-label="Filtros da pesquisa">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href={bookSearchHref(basePath, { query, onlyAvailable })}
              aria-current={category === "" ? "true" : undefined}
              className={`${CHIP} ${category === "" ? CHIP_ON : CHIP_OFF}`}
            >
              Todas as categorias
            </Link>
          </li>
          {categories.map((name) => (
            <li key={name}>
              <Link
                href={bookSearchHref(basePath, { query, category: name, onlyAvailable })}
                aria-current={category === name ? "true" : undefined}
                className={`${CHIP} ${category === name ? CHIP_ON : CHIP_OFF}`}
              >
                {name}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={bookSearchHref(basePath, { query, category, onlyAvailable: !onlyAvailable })}
              aria-current={onlyAvailable ? "true" : undefined}
              className={`${CHIP} ${onlyAvailable ? CHIP_ON : CHIP_OFF}`}
            >
              Disponíveis
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
