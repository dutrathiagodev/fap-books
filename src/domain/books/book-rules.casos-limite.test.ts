import { describe, expect, it } from "vitest";
import { availableCopies, bookSituation, cleanSearchTerm, confirmsTitle, isUuid, parseBookFilters } from "./book-rules";

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

describe("cleanSearchTerm (hífens)", () => {
  it("hífens repetidos viram um só", () => {
    expect(cleanSearchTerm("a---b")).toBe("a-b");
  });
});

describe("cleanSearchTerm (parênteses)", () => {
  it("parênteses e aspas viram espaço e somem das pontas", () => {
    expect(cleanSearchTerm('("livro")')).toBe("livro");
  });
});

describe("confirmsTitle (vazio)", () => {
  it("título vazio nunca libera a exclusão", () => {
    expect(confirmsTitle("", "")).toBe(false);
  });
});

describe("isUuid (formato)", () => {
  it("aceita maiúsculas e recusa espaço no fim", () => {
    const id = "62564DF1-91B4-42EF-842F-2B3CA29184E5";
    expect(isUuid(id)).toBe(true);
    expect(isUuid(`${id} `)).toBe(false);
  });
});

describe("parseBookFilters (página)", () => {
  it("página com texto vale 1", () => {
    expect(parseBookFilters({ pagina: "abc" }).page).toBe(1);
  });
});

describe("parseBookFilters (limite)", () => {
  it("página enorme é limitada a 10000", () => {
    expect(parseBookFilters({ pagina: "99999999" }).page).toBe(10000);
  });
});

describe("parseBookFilters (repetido)", () => {
  it("com parâmetro repetido vale o primeiro", () => {
    expect(parseBookFilters({ q: ["Dom", "Casmurro"] }).query).toBe("Dom");
  });
});

describe("parseBookFilters (categoria)", () => {
  it("categoria é aparada e cortada em 60 caracteres", () => {
    expect(parseBookFilters({ categoria: `  ${"a".repeat(80)}  ` }).category).toBe("a".repeat(60));
  });
});
