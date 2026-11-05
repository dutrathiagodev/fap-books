import { describe, expect, it } from "vitest";
import { shelfByBook, shelfStatus, type ShelfRow } from "./book-shelf";

const row = (over: Partial<ShelfRow> = {}): ShelfRow => ({
  book_id: "b1",
  open_loans: 0,
  has_active_reservation: false,
  ...over,
});

describe("shelfByBook", () => {
  it("indexa as linhas pelo id do livro", () => {
    const map = shelfByBook([row(), row({ book_id: "b2", open_loans: 2 })]);
    expect(map.get("b2")?.open_loans).toBe(2);
    expect(map.size).toBe(2);
  });
});

describe("shelfStatus", () => {
  it("livro sem linha está disponível, com todos os exemplares livres e sem data", () => {
    expect(shelfStatus(3, undefined)).toEqual({ situation: "available", freeCopies: 3, nextDueAt: null });
  });

  it("todos os exemplares emprestados deixam o livro indisponível, com a previsão de devolução", () => {
    expect(shelfStatus(1, row({ open_loans: 1, next_due_at: "2026-11-10" }))).toEqual({
      situation: "unavailable",
      freeCopies: 0,
      nextDueAt: "2026-11-10",
    });
  });

  it("reserva ativa marca o livro como reservado", () => {
    expect(shelfStatus(2, row({ has_active_reservation: true })).situation).toBe("reserved");
  });
});
