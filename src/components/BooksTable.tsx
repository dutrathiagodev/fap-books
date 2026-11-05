import { BookOpen } from "lucide-react";
import { availableCopies, bookSituation } from "@/domain/books/book-rules";
import type { BookActionResult, BookListItem } from "@/types/book";
import { BookCover } from "./BookCover";
import { BookRowActions } from "./BookRowActions";
import { DataTable, type DataTableColumn } from "./DataTable";
import { SituationBadge } from "./SituationBadge";

interface BooksTableProps {
  books: BookListItem[];
  onDelete: (bookId: string) => Promise<BookActionResult>;
  onInactivate: (bookId: string) => Promise<BookActionResult>;
}

// Tabela do acervo da bibliotecária (Figma, card 0113): título, autor, categoria, código, disponibilidade e ações.
// Usa a tabela do design system; no celular ela vira cartões.
export function BooksTable({ books, onDelete, onInactivate }: BooksTableProps) {
  const columns: DataTableColumn<BookListItem>[] = [
    {
      key: "title",
      header: "Título e edição",
      cell: (book) => (
        <div className="flex items-center gap-3">
          <BookCover
            url={book.coverUrl}
            width={32}
            height={44}
            className="h-11 w-8 shrink-0 rounded-sm object-cover"
            fallback={
              <span aria-hidden className="flex h-11 w-8 shrink-0 items-center justify-center rounded-sm bg-selected text-brand">
                <BookOpen size={16} />
              </span>
            }
          />
          <span className="font-medium">{book.title}</span>
        </div>
      ),
    },
    { key: "author", header: "Autor(es)", cell: (book) => book.author },
    {
      key: "category",
      header: "Categoria",
      cell: (book) =>
        book.category ? (
          <span className="inline-block whitespace-nowrap rounded-full bg-selected px-2.5 py-1 text-xs font-medium text-brand">{book.category}</span>
        ) : (
          "—"
        ),
    },
    { key: "code", header: "Código", cell: (book) => <span className="text-ink-muted">{book.code}</span> },
    { key: "copies", header: "Disp.", cell: (book) => `${availableCopies(book.quantity, book.openLoans)} / ${book.quantity}` },
    { key: "situation", header: "Status", cell: (book) => <SituationBadge situation={bookSituation(book)} /> },
    {
      key: "actions",
      header: "Ações",
      cell: (book) => <BookRowActions book={book} onDelete={onDelete} onInactivate={onInactivate} />,
    },
  ];

  return <DataTable columns={columns} rows={books} rowKey={(book) => book.id} emptyLabel="Nenhum livro encontrado." />;
}
