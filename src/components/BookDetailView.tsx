import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { catalogRows, formatBrazilDate } from "@/domain/books/book-rules";
import { plural } from "@/domain/format";
import type { BookDetail } from "@/types/book";
import { BookCover } from "./BookCover";
import { SituationBadge } from "./SituationBadge";

// Página de detalhe do livro (Figma, card 0111): capa, dados do catálogo, situação e exemplares. Só desenha:
// a página carrega o livro e entrega os blocos de reserva (aluno e professor) e de fila (funcionária).
export function BookDetailView({
  book,
  backHref,
  reservation,
  queue,
}: {
  book: BookDetail;
  backHref: string;
  // Reservar e acompanhar a fila (aluno e professor).
  reservation?: ReactNode;
  // Fila de espera do livro (funcionária), abaixo dos dados do catálogo.
  queue?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-link hover:underline">
        <ArrowLeft size={16} aria-hidden />
        Voltar para o acervo
      </Link>

      <div className="grid gap-8 md:grid-cols-[18rem_1fr]">
        <div className="flex h-80 items-center justify-center rounded-lg bg-selected md:h-96">
          <BookCover
            priority
            url={book.coverUrl}
            alt={`Capa de ${book.title}`}
            className="h-72 w-auto rounded-md shadow-md md:h-80"
            fallback={<BookOpen aria-hidden size={56} className="text-brand" />}
          />
        </div>

        <div className="flex flex-col gap-4">
          {book.category && (
            <p>
              <span className="inline-block whitespace-nowrap rounded-full bg-selected px-3 py-1 text-xs font-medium text-brand-ink">
                {book.category}
              </span>
            </p>
          )}
          <h1 className="font-heading text-3xl font-bold leading-tight">{book.title}</h1>
          <p className="text-ink-muted">{book.author}</p>

          <p className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
            <SituationBadge situation={book.situation} />
            <span>
              {book.freeCopies} de {book.quantity} {plural(book.quantity, "exemplar livre", "exemplares livres")}
            </span>
            {book.situation === "unavailable" && book.nextDueAt && (
              <span>Devolução prevista: {formatBrazilDate(book.nextDueAt)}</span>
            )}
          </p>

          {book.description && <p className="max-w-prose leading-relaxed">{book.description}</p>}

          {reservation}
        </div>
      </div>

      <section aria-labelledby="catalog-title" className="rounded-lg border border-line bg-surface p-6">
        <h2 id="catalog-title" className="font-heading text-xl font-bold">
          Dados do catálogo
        </h2>
        <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {catalogRows(book).map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <dt className="w-28 shrink-0 text-ink-muted">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {queue}
    </div>
  );
}
