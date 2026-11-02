import { describe, expect, it } from "vitest";
import {
  availabilityParam,
  availableCopies,
  bookAvailability,
  bookSearchHref,
  booksHref,
  cleanSearchTerm,
  bookSituation,
  confirmsTitle,
  countSituations,
  isUuid,
  pageNumbers,
  parseAvailabilityFilter,
  parseBookFilters,
} from "./book-rules";

describe("availableCopies", () => {
  it("desconta os empréstimos em aberto", () => {
    expect(availableCopies(8, 2)).toBe(6);
  });
  it("nunca fica negativo", () => {
    expect(availableCopies(1, 3)).toBe(0);
  });
});

describe("bookAvailability", () => {
  it("livro inativo fica inativo, mesmo com exemplar na estante", () => {
    expect(bookAvailability({ quantity: 5, openLoans: 0, status: "inactive" })).toBe("inactive");
  });
  it("sem exemplar na estante fica indisponível", () => {
    expect(bookAvailability({ quantity: 2, openLoans: 2, status: "active" })).toBe("unavailable");
  });
  it("com exemplar na estante fica disponível", () => {
    expect(bookAvailability({ quantity: 2, openLoans: 1, status: "active" })).toBe("available");
  });
});

describe("bookSituation", () => {
  const base = { quantity: 4, openLoans: 1, status: "active" as const, hasActiveReservation: false };

  it("com exemplar livre e sem reserva fica disponível", () => {
    expect(bookSituation(base)).toBe("available");
  });
  it("com exemplar livre guardado para reserva fica reservado", () => {
    expect(bookSituation({ ...base, hasActiveReservation: true })).toBe("reserved");
  });
  it("sem exemplar livre fica emprestado, mesmo com reserva", () => {
    expect(bookSituation({ ...base, openLoans: 4, hasActiveReservation: true })).toBe("unavailable");
  });
  it("livro inativo fica inativo, mesmo com reserva", () => {
    expect(bookSituation({ ...base, status: "inactive", hasActiveReservation: true })).toBe("inactive");
  });
});

describe("countSituations", () => {
  const active = { quantity: 2, status: "active" as const };

  it("conta cada situação e soma o total dos livros ativos", () => {
    const counts = countSituations([
      { ...active, openLoans: 0, hasActiveReservation: false },
      { ...active, openLoans: 0, hasActiveReservation: false },
      { ...active, openLoans: 2, hasActiveReservation: false },
      { ...active, openLoans: 1, hasActiveReservation: true },
    ]);
    expect(counts).toEqual({ available: 2, unavailable: 1, reserved: 1 });
  });
  it("não conta livro inativo", () => {
    expect(countSituations([{ quantity: 2, status: "inactive", openLoans: 0, hasActiveReservation: false }])).toEqual({
      available: 0,
      unavailable: 0,
      reserved: 0,
    });
  });
  it("lista vazia zera tudo", () => {
    expect(countSituations([])).toEqual({ available: 0, unavailable: 0, reserved: 0 });
  });
});

describe("cleanSearchTerm", () => {
  it("tira os caracteres que quebram o filtro", () => {
    expect(cleanSearchTerm('a,b)(c*d%e"f')).toBe("a b c d e f");
  });
  it("limita o tamanho", () => {
    expect(cleanSearchTerm("x".repeat(200))).toHaveLength(80);
  });
});

describe("confirmsTitle", () => {
  it("aceita o nome sem diferenciar maiúsculas nem espaços sobrando", () => {
    expect(confirmsTitle("  dom   casmurro ", "Dom Casmurro")).toBe(true);
  });
  it("recusa nome diferente ou vazio", () => {
    expect(confirmsTitle("Dom", "Dom Casmurro")).toBe(false);
    expect(confirmsTitle("", "")).toBe(false);
  });
});

describe("isUuid", () => {
  it("reconhece id válido e recusa texto", () => {
    expect(isUuid("3f2b6c1e-8a4d-4f0e-9c7a-1b2d3e4f5a6b")).toBe(true);
    expect(isUuid("1 or 1=1")).toBe(false);
  });
});

describe("parseBookFilters", () => {
  it("sem parâmetros usa o padrão", () => {
    expect(parseBookFilters({})).toEqual({ query: "", category: "", status: "all", page: 1 });
  });
  it("lê os filtros e ignora status e página inválidos", () => {
    expect(parseBookFilters({ q: "dom", categoria: "Direito", status: "inactive", pagina: "3" })).toEqual({
      query: "dom",
      category: "Direito",
      status: "inactive",
      page: 3,
    });
    expect(parseBookFilters({ status: "x", pagina: "-2" })).toMatchObject({ status: "all", page: 1 });
  });
});

describe("bookSearchHref", () => {
  it("sem filtros devolve só o caminho", () => {
    expect(bookSearchHref("/aluno/livros", {})).toBe("/aluno/livros");
    expect(bookSearchHref("/aluno/livros", { query: "", category: "", availability: "all" })).toBe("/aluno/livros");
  });
  it("leva só o que tem valor e codifica o texto", () => {
    expect(bookSearchHref("/aluno/livros", { query: "dom casmurro", category: "Romance", availability: "borrowed" })).toBe(
      "/aluno/livros?q=dom+casmurro&categoria=Romance&situacao=emprestado",
    );
    expect(bookSearchHref("/aluno/livros", { category: "Saúde" })).toBe("/aluno/livros?categoria=Sa%C3%BAde");
  });
});

describe("parseAvailabilityFilter", () => {
  it("lê as três situações e trata o resto como todos", () => {
    expect(parseAvailabilityFilter({ situacao: "disponivel" })).toBe("available");
    expect(parseAvailabilityFilter({ situacao: "emprestado" })).toBe("borrowed");
    expect(parseAvailabilityFilter({ situacao: ["reservado", "x"] })).toBe("reserved");
    expect(parseAvailabilityFilter({ situacao: "x" })).toBe("all");
    expect(parseAvailabilityFilter({})).toBe("all");
  });
  it("ida e volta com bookSearchHref", () => {
    for (const availability of ["available", "borrowed", "reserved"] as const) {
      const param = availabilityParam(availability);
      expect(parseAvailabilityFilter({ situacao: param })).toBe(availability);
    }
  });
});

describe("pageNumbers", () => {
  it("mostra todas as páginas quando são poucas", () => {
    expect(pageNumbers(1, 3)).toEqual([1, 2, 3]);
    expect(pageNumbers(1, 1)).toEqual([1]);
  });
  it("na primeira página esconde o meio com reticências", () => {
    expect(pageNumbers(1, 24)).toEqual([1, 2, "…", 24]);
  });
  it("no meio mostra a atual e as vizinhas", () => {
    expect(pageNumbers(12, 24)).toEqual([1, "…", 11, 12, 13, "…", 24]);
  });
  it("na última página mostra as duas finais", () => {
    expect(pageNumbers(24, 24)).toEqual([1, "…", 23, 24]);
  });
  it("buraco de uma página mostra o número em vez de reticências", () => {
    expect(pageNumbers(4, 24)).toEqual([1, 2, 3, 4, 5, "…", 24]);
  });
});

describe("booksHref", () => {
  it("só leva os filtros com valor", () => {
    expect(booksHref({})).toBe("/funcionario/acervo");
    expect(booksHref({ query: "dom", status: "active", page: 2 })).toBe("/funcionario/acervo?q=dom&status=active&pagina=2");
  });
});
