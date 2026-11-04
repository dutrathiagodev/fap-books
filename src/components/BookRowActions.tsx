"use client";

import { useState, useTransition } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
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

// Ações da linha do acervo (Figma, card 0113): ver e editar chegam nos cards 0116 e 0117;
// excluir abre a confirmação com o nome do livro, ou o aviso de histórico (só inativar).
export function BookRowActions({ book, onDelete, onInactivate }: BookRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const alreadyInactive = book.status === "inactive";

  const title = !book.hasHistory ? "Excluir livro?" : alreadyInactive ? "Este livro já está inativo" : "Este livro tem histórico";
  const description = !book.hasHistory
    ? `Você vai excluir "${book.title}" definitivamente. Esta ação não pode ser desfeita.`
    : alreadyInactive
      ? `"${book.title}" tem histórico e não pode ser excluído. Ele já está fora do acervo ativo e o histórico é mantido.`
      : `"${book.title}" tem empréstimos ou reservas no histórico e não pode ser excluído. Você pode inativá-lo: ele sai do acervo ativo e o histórico é mantido.`;
  const confirmLabel = !book.hasHistory
    ? pending ? "Excluindo..." : "Excluir livro"
    : alreadyInactive ? undefined : pending ? "Inativando..." : "Inativar livro";

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
      <button type="button" disabled title="Ver detalhes (em breve)" aria-label={`Ver ${book.title}`} className={`${ICON_BUTTON} cursor-not-allowed text-ink-muted opacity-50`}>
        <Eye size={16} aria-hidden />
      </button>
      <button type="button" disabled title="Editar (em breve)" aria-label={`Editar ${book.title}`} className={`${ICON_BUTTON} cursor-not-allowed text-ink-muted opacity-50`}>
        <Pencil size={16} aria-hidden />
      </button>
      <button
        type="button"
        onClick={open}
        title="Excluir"
        aria-label={`Excluir ${book.title}`}
        className={`${ICON_BUTTON} cursor-pointer border-danger-100 bg-danger-100 text-danger-700 hover:bg-danger-700 hover:text-white`}
      >
        <Trash2 size={16} aria-hidden />
      </button>

      <Modal
        open={isOpen}
        destructive
        title={title}
        description={description}
        cancelLabel={book.hasHistory && alreadyInactive ? "Fechar" : "Cancelar"}
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
