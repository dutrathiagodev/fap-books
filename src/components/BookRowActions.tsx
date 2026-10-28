"use client";

import { useRef, useState, useTransition } from "react";
import { Eye, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { confirmsTitle } from "@/domain/books/book-rules";
import type { BookActionResult, BookListItem } from "@/types/book";

interface BookRowActionsProps {
  book: BookListItem;
  // As ações do servidor chegam por props: o componente não conhece o banco.
  onDelete: (bookId: string) => Promise<BookActionResult>;
  onInactivate: (bookId: string) => Promise<BookActionResult>;
}

const ICON_BUTTON =
  "flex size-8 items-center justify-center rounded-md border border-line outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus";

const ERROR_TEXT: Record<"has_history" | "not_found" | "error", string> = {
  has_history: "Este livro já tem histórico e não pode ser excluído. Atualize a página e inative o livro.",
  not_found: "Não encontramos este livro. Atualize a página.",
  error: "Não foi possível concluir agora. Tente de novo.",
};

// Ações da linha do acervo (Figma, card 0113): ver e editar chegam nos cards 0116 e 0117;
// excluir abre a confirmação com o nome do livro, ou o aviso de histórico (só inativar).
export function BookRowActions({ book, onDelete, onInactivate }: BookRowActionsProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const alreadyInactive = book.status === "inactive";

  function open() {
    setTyped("");
    setError("");
    dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
  }

  function run(action: (bookId: string) => Promise<BookActionResult>) {
    start(async () => {
      const result = await action(book.id);
      if (result.ok) close();
      else setError(ERROR_TEXT[result.reason]);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled title="Em breve" aria-label={`Ver ${book.title}`} className={`${ICON_BUTTON} cursor-not-allowed text-ink-muted opacity-50`}>
        <Eye size={16} aria-hidden />
      </button>
      <button type="button" disabled title="Em breve" aria-label={`Editar ${book.title}`} className={`${ICON_BUTTON} cursor-not-allowed text-ink-muted opacity-50`}>
        <Pencil size={16} aria-hidden />
      </button>
      <button
        type="button"
        onClick={open}
        aria-label={`Excluir ${book.title}`}
        className={`${ICON_BUTTON} cursor-pointer border-danger-100 bg-danger-100 text-danger-700 hover:bg-danger-700 hover:text-white`}
      >
        <Trash2 size={16} aria-hidden />
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={`dialog-${book.id}`}
        className="m-auto w-[min(92vw,26rem)] rounded-lg border border-line bg-surface p-6 text-ink shadow-lg backdrop:bg-ink/50"
      >
        {book.hasHistory ? (
          <div className="flex flex-col gap-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-warning-100 text-warning-700">
              <TriangleAlert size={20} aria-hidden />
            </span>
            <h2 id={`dialog-${book.id}`} className="text-h3">
              {alreadyInactive ? "Este livro já está inativo" : "Este livro tem histórico"}
            </h2>
            <p className="text-sm text-ink-muted">
              {alreadyInactive
                ? `"${book.title}" tem histórico e não pode ser excluído. Ele já está fora do acervo ativo e o histórico é mantido.`
                : `"${book.title}" tem empréstimos ou reservas no histórico e não pode ser excluído. Você pode inativá-lo: ele sai do acervo ativo e o histórico é mantido.`}
            </p>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={close} className="cursor-pointer rounded-md border border-line-strong px-4 py-2 text-sm font-medium hover:bg-subtle">
                {alreadyInactive ? "Fechar" : "Cancelar"}
              </button>
              {!alreadyInactive && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(onInactivate)}
                  className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pending ? "Inativando..." : "Inativar livro"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (confirmsTitle(typed, book.title)) run(onDelete);
            }}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-danger-100 text-danger-700">
              <Trash2 size={20} aria-hidden />
            </span>
            <h2 id={`dialog-${book.id}`} className="text-h3">
              Excluir livro?
            </h2>
            <p className="text-sm text-ink-muted">
              Você vai excluir &quot;{book.title}&quot; definitivamente. Esta ação não pode ser desfeita.
            </p>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Digite o nome do livro para confirmar
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={book.title}
                autoComplete="off"
                className="h-11 rounded-md border border-line-strong bg-surface px-3 text-base font-normal outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={close} className="cursor-pointer rounded-md border border-line-strong px-4 py-2 text-sm font-medium hover:bg-subtle">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending || !confirmsTitle(typed, book.title)}
                className="flex cursor-pointer items-center gap-2 rounded-md bg-danger-700 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={16} aria-hidden />
                {pending ? "Excluindo..." : "Excluir livro"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
