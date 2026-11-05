import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import type { BookAvailabilityFilter, BookSearchItem } from "@/types/book";
import type { BookSort } from "@/domain/books/book-rules";
import { BookCover } from "./BookCover";
import { SituationLine } from "./BookCatalogCard";

interface StudentSearchHeroProps {
  basePath: string;
  query: string;
  // Filtros ativos: o Buscar os mantém, como na barra de filtros.
  category: string;
  availability: BookAvailabilityFilter;
  sort: BookSort;
  // Livro em destaque (o mais recente com capa); sem ele o topo fica só com a busca.
  featured: BookSearchItem | null;
}

// Topo da pesquisa do aluno (Figma, card 0108, visual editorial): chamada, busca e o livro em destaque. O frame
// também traz "Indicação do professor" e "Em posse"; os dois dependem de dados que ainda não existem e ficam fora.
export function StudentSearchHero({ basePath, query, category, availability, sort, featured }: StudentSearchHeroProps) {
  return (
    <section
      aria-labelledby="hero-title"
      className="mb-10 grid items-center gap-8 overflow-hidden rounded-2xl bg-selected p-6 md:grid-cols-[minmax(0,1fr)_auto] md:p-10"
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">Biblioteca FAP</p>
        <h1 id="hero-title" className="text-h1">
          Descubra o próximo livro
        </h1>
        <p className="max-w-md text-base text-ink-muted">
          Pesquise por título, autor ou assunto e veja a disponibilidade em poucos cliques.
        </p>
        <form method="get" action={basePath} role="search" aria-label="Pesquisar livros" className="flex max-w-xl gap-2">
          {category && <input type="hidden" name="categoria" value={category} />}
          {availability !== "all" && <input type="hidden" name="situacao" value={availability} />}
          {sort !== "relevance" && <input type="hidden" name="ordem" value={sort} />}
          <label htmlFor="hero-search" className="sr-only">
            Buscar por título, autor, ISBN ou assunto
          </label>
          <div className="relative min-w-0 flex-1">
            <Search size={16} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              id="hero-search"
              name="q"
              type="search"
              defaultValue={query}
              maxLength={80}
              placeholder="Título, autor ou assunto"
              className="h-12 w-full rounded-full border border-line-strong bg-surface pl-11 pr-4 text-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus"
            />
          </div>
          <button
            type="submit"
            className="h-12 shrink-0 cursor-pointer rounded-full bg-brand px-6 text-sm font-medium text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Buscar
          </button>
        </form>
      </div>

      {featured && (
        <Link
          href={`${basePath}/${featured.id}`}
          className="group relative mx-auto flex w-56 flex-col gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          <span className="absolute -top-2 left-2 z-10 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-brand shadow-sm">
            Destaque
          </span>
          <BookCover
            url={featured.coverUrl}
            alt={`Capa de ${featured.title}`}
            className="h-72 w-full rounded-md object-cover shadow-md transition-transform group-hover:-translate-y-1"
            fallback={<BookOpen aria-hidden size={56} className="text-brand" />}
          />
          <span>
            <span className="block font-heading text-base font-bold leading-snug">{featured.title}</span>
            <span className="mb-1 block text-sm text-ink-muted">{featured.author}</span>
            <SituationLine book={featured} />
          </span>
        </Link>
      )}
    </section>
  );
}
