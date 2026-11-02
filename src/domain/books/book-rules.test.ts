import { describe, expect, it } from "vitest";
import {
  availabilityParam,
  availableCopies,
  bookAvailability,
  bookSearchHref,
  booksHref,
  cleanSearchTerm,
  confirmsTitle,
  isUuid,
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

describe("booksHref", () => {
  it("só leva os filtros com valor", () => {
    expect(booksHref({})).toBe("/funcionario/acervo");
    expect(booksHref({ query: "dom", status: "active", page: 2 })).toBe("/funcionario/acervo?q=dom&status=active&pagina=2");
  });
});
