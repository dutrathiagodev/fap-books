import { BookOpen } from "lucide-react";
import type { BookSearchItem } from "@/types/book";
import { SituationBadge } from "./SituationBadge";

// Cartão de livro da pesquisa (Figma, card 0108): capa, categoria, título, autor, situação e "Ver detalhes".
// O botão fica desativado até a página de detalhe (card 0111) existir.
export function BookResultCard({ book }: { book: BookSearchItem }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="relative flex h-44 items-center justify-center rounded-lg bg-selected">
        {book.coverUrl ? (
          // Capa do Storage do Supabase: imagem simples, sem passar pelo otimizador do Next.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverUrl} alt="" className="h-36 w-auto rounded-md shadow-md" />
        ) : (
          <BookOpen aria-hidden size={40} className="text-brand" />
        )}
        {book.category && (
          <span className="absolute left-2 top-2 rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-brand">
            {book.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="font-heading text-lg font-bold leading-snug">{book.title}</h3>
        <p className="text-sm text-ink-muted">{book.author}</p>
        <p className="text-xs text-ink-muted">Cód. {book.code}</p>
      </div>
      <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <SituationBadge situation={book.situation} />
        {book.freeCopies > 0 && (
          <span>
            {book.freeCopies} {book.freeCopies === 1 ? "exemplar" : "exemplares"}
          </span>
        )}
      </p>
      <button
        type="button"
        disabled
        title="Em breve"
        className="h-10 cursor-not-allowed rounded-md border border-line-strong text-sm font-medium opacity-60"
      >
        Ver detalhes
      </button>
    </article>
  );
}
