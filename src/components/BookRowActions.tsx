"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Archive, Eye, Pencil, Trash2 } from "lucide-react";
import { ACERVO_PATH } from "@/domain/access/access-rules";
import { confirmsTitle } from "@/domain/books/book-rules";
import type { BookActionResult, BookListItem } from "@/types/book";
import { Modal } from "./Modal";
import { TextField } from "./TextField";

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

// Ações da linha do acervo (Figma, card 0113): ver abre o detalhe e editar leva ao formulário (0120). Livro sem
// histórico tem o excluir, que pede o nome do livro; livro com histórico tem o excluir desabilitado (com a dica) e o
// inativar no lugar, que o tira do acervo ativo e mantém o histórico.
export function BookRowActions({ book, onDelete, onInactivate }: BookRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const alreadyInactive = book.status === "inactive";

  const title = book.hasHistory ? "Este livro tem histórico" : "Excluir livro?";
  const description = book.hasHistory
    ? `"${book.title}" tem empréstimos ou reservas no histórico e não pode ser excluído. Você pode inativá-lo: ele sai do acervo ativo e o histórico é mantido.`
    : `Você vai excluir "${book.title}" definitivamente. Esta ação não pode ser desfeita.`;
  const confirmLabel = book.hasHistory
    ? pending ? "Inativando..." : "Inativar livro"
    : pending ? "Excluindo..." : "Excluir livro";

  function open() {
    setTyped("");
    setError("");
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
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
      <Link href={`${ACERVO_PATH}/${book.id}`} title="Ver detalhes" aria-label={`Ver ${book.title}`} className={`${ICON_BUTTON} text-ink-muted hover:bg-subtle`}>
        <Eye size={16} aria-hidden />
      </Link>
      <Link href={`${ACERVO_PATH}/${book.id}/editar`} title="Editar" aria-label={`Editar ${book.title}`} className={`${ICON_BUTTON} text-ink-muted hover:bg-subtle`}>
        <Pencil size={16} aria-hidden />
      </Link>
      {book.hasHistory ? (
        <>
          <button
            type="button"
            disabled
            title="Livro com histórico: use Inativar"
            aria-label={`Excluir ${book.title} (livro com histórico: use Inativar)`}
            className={`${ICON_BUTTON} cursor-not-allowed border-danger-100 bg-danger-100 text-danger-700 opacity-50`}
          >
            <Trash2 size={16} aria-hidden />
          </button>
          {!alreadyInactive && (
            <button
              type="button"
              onClick={open}
              title="Inativar"
              aria-label={`Inativar ${book.title}`}
              className={`${ICON_BUTTON} cursor-pointer text-ink-muted hover:bg-subtle`}
            >
              <Archive size={16} aria-hidden />
            </button>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={open}
          title="Excluir"
          aria-label={`Excluir ${book.title}`}
          className={`${ICON_BUTTON} cursor-pointer border-danger-100 bg-danger-100 text-danger-700 hover:bg-danger-700 hover:text-white`}
        >
          <Trash2 size={16} aria-hidden />
        </button>
      )}

      <Modal
        open={isOpen}
        destructive
        title={title}
        description={description}
        cancelLabel="Cancelar"
        confirmLabel={confirmLabel}
        confirmVariant={book.hasHistory ? "primary" : "danger"}
        confirmDisabled={pending || (!book.hasHistory && !confirmsTitle(typed, book.title))}
        onConfirm={() => run(book.hasHistory ? onInactivate : onDelete)}
        onClose={close}
      >
        {!book.hasHistory && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (confirmsTitle(typed, book.title)) run(onDelete);
            }}
          >
            <TextField
              id={`confirm-${book.id}`}
              label="Digite o nome do livro para confirmar"
              placeholder={book.title}
              autoComplete="off"
              value={typed}
              onChange={setTyped}
            />
          </form>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </Modal>
    </div>
  );
}
