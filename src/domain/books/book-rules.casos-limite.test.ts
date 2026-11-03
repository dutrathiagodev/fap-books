import { describe, expect, it } from "vitest";
import { availableCopies, bookSituation, cleanSearchTerm } from "./book-rules";

describe("availableCopies (limites)", () => {
  it("sem empréstimo devolve todos os exemplares", () => {
    expect(availableCopies(3, 0)).toBe(3);
  });
});

describe("availableCopies (zero)", () => {
  it("com quantidade zero não sobra exemplar", () => {
    expect(availableCopies(0, 0)).toBe(0);
  });
});

describe("bookSituation (sem exemplar)", () => {
  it("livro ativo com quantidade zero fica emprestado", () => {
    expect(bookSituation({ quantity: 0, openLoans: 0, status: "active", hasActiveReservation: false })).toBe("unavailable");
  });
});

describe("cleanSearchTerm (vazio)", () => {
  it("só espaços viram texto vazio", () => {
    expect(cleanSearchTerm("     ")).toBe("");
  });
});
