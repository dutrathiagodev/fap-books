import Link from "next/link";
import { BookOpen } from "lucide-react";
import { formatBrazilDate } from "@/domain/books/book-rules";
import { plural } from "@/domain/format";
import type { BookSearchItem, BookSituation } from "@/types/book";
import { BookCover } from "./BookCover";

// Linha de situação do Figma (card 0108, visual editorial): ponto e texto na cor do estado, sem selo.
const SITUATION: Record<BookSituation, { dot: string; text: string }> = {
  available: { dot: "bg-success-700 dark:bg-green-300", text: "text-success-700 dark:text-green-300" },
  unavailable: { dot: "bg-danger-700 dark:bg-red-300", text: "text-danger-700 dark:text-red-300" },
  reserved: { dot: "bg-warning-700 dark:bg-amber-300", text: "text-warning-700 dark:text-amber-300" },
  inactive: { dot: "bg-ink-muted", text: "text-ink-muted" },
};

function situationText(book: BookSearchItem): string {
  switch (book.situation) {
    case "available":
      return `Disponível · ${book.freeCopies} ${plural(book.freeCopies, "exemplar", "exemplares")}`;
    case "unavailable":
      return book.nextDueAt ? `Emprestado · ${formatBrazilDate(book.nextDueAt)}` : "Emprestado";
    case "reserved":
      return "Reservado";
    case "inactive":
      return "Inativo";
  }
}

// Texto e ponto da situação do livro (usado no cartão do acervo e nas novidades).
const TINTED_TEXT: Partial<Record<BookSituation, string>> = {
  available: "text-success-800 dark:text-green-300",
  reserved: "text-ink dark:text-amber-300",
};

// "tinted": a linha fica sobre o fundo azul do destaque, onde o verde e o âmbar 700 não atingem 4,5:1.
export function SituationLine({ book, tinted = false }: { book: BookSearchItem; tinted?: boolean }) {
  const { dot } = SITUATION[book.situation];
  const text = (tinted && TINTED_TEXT[book.situation]) || SITUATION[book.situation].text;
  return (
    <p className={`flex items-center gap-1.5 text-xs font-medium ${text}`}>
      <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${dot}`} />
      {situationText(book)}
    </p>
  );
}

const DETAIL_LINK =
  "inline-flex h-8 shrink-0 items-center rounded-full border border-line-strong px-3 text-xs font-medium text-ink hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// Cartão do "Todo o acervo" (Figma, card 0108, visual editorial): capa sobre painel claro, categoria, título, autor,
// situação e o botão. O frame traz "Reservar", "Avisar-me" e "Fila de espera"; enquanto a reserva não existe, o botão
// leva ao detalhe do livro.
export function BookCatalogCard({ book, basePath }: { book: BookSearchItem; basePath: string }) {
  return (
    <article className="flex h-full flex-col gap-3">
      <Link
        href={`${basePath}/${book.id}`}
        aria-label={`Ver ${book.title}`}
        className="flex h-52 items-center justify-center rounded-xl bg-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <BookCover
          url={book.coverUrl}
          className="h-40 w-auto rounded-md shadow-md"
          fallback={<BookOpen aria-hidden size={40} className="text-brand" />}
        />
      </Link>
      <div className="flex flex-1 flex-col gap-1">
        {book.category && (
          <p className="text-[11px] font-medium uppercase tracking-wide text-brand">{book.category}</p>
        )}
        <h3 className="font-heading text-base font-bold leading-snug">{book.title}</h3>
        <p className="text-sm text-ink-muted">{book.author}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <SituationLine book={book} />
        <Link href={`${basePath}/${book.id}`} className={DETAIL_LINK}>
          Ver detalhes
        </Link>
      </div>
    </article>
  );
}
