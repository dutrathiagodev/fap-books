import { BookOpen } from "lucide-react";
import { availableCopies, bookAvailability, type BookAvailability } from "@/domain/books/book-rules";
import type { BookActionResult, BookListItem } from "@/types/book";
import { BookRowActions } from "./BookRowActions";

interface BooksTableProps {
  books: BookListItem[];
  onDelete: (bookId: string) => Promise<BookActionResult>;
  onInactivate: (bookId: string) => Promise<BookActionResult>;
}

const STATUS: Record<BookAvailability, { label: string; className: string }> = {
  available: { label: "Disponível", className: "bg-success-100 text-success-700" },
  unavailable: { label: "Emprestado", className: "bg-info-100 text-info-700" },
  inactive: { label: "Inativo", className: "bg-subtle text-ink-muted" },
};

// Tabela do acervo da bibliotecária (Figma, card 0113): título, autor, categoria, código, disponibilidade e ações.
export function BooksTable({ books, onDelete, onInactivate }: BooksTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Título e edição</th>
            <th scope="col" className="px-4 py-3 font-medium">Autor(es)</th>
            <th scope="col" className="px-4 py-3 font-medium">Categoria</th>
            <th scope="col" className="px-4 py-3 font-medium">Código</th>
            <th scope="col" className="px-4 py-3 font-medium">Disp.</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            <th scope="col" className="px-4 py-3 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => {
            const status = STATUS[bookAvailability(book)];
            return (
              <tr key={book.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {book.coverUrl ? (
                      // Capa do Storage do Supabase: imagem simples, sem passar pelo otimizador do Next.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={book.coverUrl} alt="" width={32} height={44} className="h-11 w-8 shrink-0 rounded-sm object-cover" />
                    ) : (
                      <span aria-hidden className="flex h-11 w-8 shrink-0 items-center justify-center rounded-sm bg-selected text-brand">
                        <BookOpen size={16} />
                      </span>
                    )}
                    <span className="font-medium">{book.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{book.author}</td>
                <td className="px-4 py-3">{book.category ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{book.code}</td>
                <td className="px-4 py-3">
                  {availableCopies(book.quantity, book.openLoans)} / {book.quantity}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                </td>
                <td className="px-4 py-3">
                  <BookRowActions book={book} onDelete={onDelete} onInactivate={onInactivate} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
