import { availableCopies, bookSituation } from "../domain/books/book-rules";
import type { BookSituation } from "@/types/book";

// Uma linha de book_availability: só contagens por livro, nunca quem pegou ou reservou.
export interface ShelfRow {
  book_id: string;
  open_loans: number;
  has_active_reservation: boolean;
  // Menor data de devolução prevista dos empréstimos em aberto (migration 20261102223000). Vazia sem empréstimo.
  next_due_at?: string | null;
}

// Indexa o resultado da função book_availability pelo id do livro.
export function shelfByBook(rows: ShelfRow[]): Map<string, ShelfRow> {
  return new Map(rows.map((row) => [row.book_id, row]));
}

// Situação de um livro ativo a partir da linha do book_availability (livro sem linha = sem empréstimo nem reserva).
export function shelfStatus(
  quantity: number,
  state: ShelfRow | undefined,
): { situation: BookSituation; freeCopies: number; nextDueAt: string | null } {
  const openLoans = state?.open_loans ?? 0;
  return {
    situation: bookSituation({
      quantity,
      status: "active",
      openLoans,
      hasActiveReservation: state?.has_active_reservation ?? false,
    }),
    freeCopies: availableCopies(quantity, openLoans),
    nextDueAt: state?.next_due_at ?? null,
  };
}
