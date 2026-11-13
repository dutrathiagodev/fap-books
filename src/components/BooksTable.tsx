"use client";

import { availableCopies, bookSituation } from "@/domain/books/book-rules";
import type { BookActionResult, BookListItem } from "@/types/book";
import { BookCover } from "./BookCover";
import { BookRowActions } from "./BookRowActions";
import { RowIcon, RowIconSprite } from "./RowIcon";
import { SituationBadge } from "./SituationBadge";

interface BooksTableProps {
  books: BookListItem[];
  onDelete: (bookId: string) => Promise<BookActionResult>;
  onInactivate: (bookId: string) => Promise<BookActionResult>;
}

const HEADERS = ["Título e edição", "Autor(es)", "Categoria", "Código", "Disp.", "Status", "Ações"];

// Tabela do acervo da bibliotecária (Figma, card 0113): título, autor, categoria, código, disponibilidade e ações.
// Card 0239: uma só marcação para os dois tamanhos. A mesma <table> vira tabela a partir de md e, no celular, cada linha
// vira um cartão (Figma 0113 mobile: capa, status, título, autor, código com disponibilidade e ações) só por CSS. Antes
// eram duas marcações, uma escondida por CSS, e o HTML passava de 150 KB. Sem JavaScript para escolher a visão, não há
// salto de layout nem diferença entre servidor e navegador. É componente de cliente para a marcação ir uma vez só na
// página: como componente de servidor, ela iria também no payload do React e o HTML quase dobraria.
export function BooksTable({ books, onDelete, onInactivate }: BooksTableProps) {
  return (
    <div className="md:overflow-hidden md:rounded-lg md:border md:border-line md:bg-surface">
      <RowIconSprite />
      <table className="block w-full text-left text-sm md:table">
        <thead className="hidden bg-subtle text-ink md:table-header-group">
          <tr>
            {HEADERS.map((header) => (
              <th key={header} scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="flex flex-col gap-3 md:table-row-group md:[&_td]:px-4 md:[&_td]:py-4">
          {books.map((book) => {
            const free = availableCopies(book.quantity, book.openLoans);
            return (
              <tr
                key={book.id}
                className="book-row"
              >
                <td className="contents md:table-cell">
                  <div className="contents md:flex md:items-center md:gap-3">
                    <BookCover
                      url={book.coverUrl}
                      width={56}
                      height={80}
                      className="col-start-1 row-span-5 row-start-1 h-20 w-14 shrink-0 rounded-sm object-cover md:h-11 md:w-8"
                      fallback={
                        <span
                          aria-hidden
                          className="col-start-1 row-span-5 row-start-1 flex h-20 w-14 shrink-0 items-center justify-center rounded-sm bg-selected text-brand-ink md:h-11 md:w-8"
                        >
                          <RowIcon name="book" size={18} />
                        </span>
                      }
                    />
                    <div className="col-start-2 row-start-2 min-w-0 mt-1 md:mt-0">
                      <span className="font-medium text-ink">{book.title}</span>
                      {(book.edition || book.publisher) && (
                        <span className="block text-xs text-ink-muted">{[book.edition, book.publisher].filter(Boolean).join(" · ")}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="col-start-2 row-start-3 text-xs text-ink-muted md:text-sm md:text-ink">{book.author}</td>
                <td className="hidden md:table-cell">
                  {book.category ? (
                    <span className="inline-block whitespace-nowrap rounded-full bg-selected px-2.5 py-1 text-xs font-medium text-brand-ink">{book.category}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="col-start-2 row-start-4 text-xs text-ink-muted">
                  <span className="md:hidden">Cód. </span>
                  {book.code}
                  <span className="md:hidden">
                    {` · ${free} / ${book.quantity} disp.`}
                  </span>
                </td>
                <td className="hidden md:table-cell">
                  {`${free} / ${book.quantity}`}
                </td>
                <td className="col-start-2 row-start-1">
                  <SituationBadge situation={bookSituation(book)} />
                </td>
                <td className="col-start-2 row-start-5 mt-2 md:mt-0">
                  <BookRowActions
                    book={{ id: book.id, title: book.title, status: book.status, hasHistory: book.hasHistory }}
                    onDelete={onDelete}
                    onInactivate={onInactivate}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
