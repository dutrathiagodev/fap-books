import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { BookSearchItem } from "@/types/book";
import { BookCover } from "./BookCover";
import { SituationLine } from "./BookCatalogCard";

// Faixa "Novidades no acervo" (Figma, card 0108, visual editorial): os livros mais recentes, em formato compacto.
export function NewArrivals({ books, basePath }: { books: BookSearchItem[]; basePath: string }) {
  if (books.length === 0) return null;
  return (
    <section aria-labelledby="arrivals-title" className="mb-10">
      <h2 id="arrivals-title" className="mb-4 font-heading text-xl font-bold">
        Novidades no acervo
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {books.map((book) => (
          <li key={book.id}>
            <Link
              href={`${basePath}/${book.id}`}
              className="flex items-start gap-3 rounded-lg p-2 hover:bg-subtle focus-visible:outline-2 focus-visible:outline-focus"
            >
              <BookCover
                url={book.coverUrl}
                alt={`Capa de ${book.title}`}
                className="h-24 w-16 shrink-0 rounded-md object-cover shadow-md"
                fallback={<BookOpen aria-hidden size={24} className="text-brand" />}
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-heading text-sm font-bold leading-snug">{book.title}</span>
                <span className="text-xs text-ink-muted">{book.author}</span>
                <SituationLine book={book} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
