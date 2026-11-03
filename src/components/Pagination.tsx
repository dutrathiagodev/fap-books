import Link from "next/link";
import { pageNumbers } from "@/domain/books/book-rules";

interface PaginationProps {
  page: number;
  pages: number;
  // Texto da esquerda, ex.: "Mostrando 1-6 de 20 livros".
  summary: string;
  // Nome da navegação para o leitor de tela, ex.: "Páginas do acervo".
  label: string;
  // Endereço de cada página: quem usa decide quais filtros ficam na URL.
  hrefFor: (page: number) => string;
}

const STEP = "rounded-md border border-line-strong px-3 py-1.5 hover:bg-subtle";

// Paginação com números (Figma, cards 0113 e 0108): Anterior, números com "…" e Próxima.
export function Pagination({ page, pages, summary, label, hrefFor }: PaginationProps) {
  return (
    <nav aria-label={label} className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-ink-muted">{summary}</span>
      <span className="flex items-center gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} className={STEP}>
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
              href={hrefFor(item)}
              aria-label={`Ir para a página ${item}`}
              className="flex size-9 items-center justify-center rounded-md border border-line-strong hover:bg-subtle"
            >
              {item}
            </Link>
          ),
        )}
        {page < pages && (
          <Link href={hrefFor(page + 1)} className={STEP}>
            Próxima
          </Link>
        )}
      </span>
    </nav>
  );
}
