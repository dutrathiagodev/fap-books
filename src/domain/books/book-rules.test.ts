import { describe, expect, it } from "vitest";
import {
  catalogRows,
  availableCopies,
  bookSearchHref,
  booksHref,
  cleanSearchTerm,
  bookSituation,
  confirmsTitle,
  countSituations,
  formatBrazilDate,
  isUuid,
  pageNumbers,
  paginateBySituation,
  parseAvailabilityFilter,
  parseBookFilters,
  parseBookSort,
  sortBooks,
} from "./book-rules";

describe("availableCopies", () => {
  it("desconta os empréstimos em aberto", () => {
    expect(availableCopies(8, 2)).toBe(6);
  });
  it("nunca fica negativo", () => {
    expect(availableCopies(1, 3)).toBe(0);
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
  it("mantém acentos, números, ponto e hífen do ISBN", () => {
    expect(cleanSearchTerm("Introdução à Teologia 3ª ed. ISBN 978-85-359")).toBe("Introdução à Teologia 3ª ed. ISBN 978-85-359");
  });
  it("não deixa passar sinais de comando SQL", () => {
    expect(cleanSearchTerm("' OR 1=1--")).toBe("OR 1 1-");
    expect(cleanSearchTerm("a; DROP TABLE books;--")).toBe("a DROP TABLE books -");
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
    expect(bookSearchHref("/aluno/livros", { query: "dom casmurro", category: "Romance", availability: "unavailable" })).toBe(
      "/aluno/livros?q=dom+casmurro&categoria=Romance&situacao=unavailable",
    );
    expect(bookSearchHref("/aluno/livros", { category: "Saúde" })).toBe("/aluno/livros?categoria=Sa%C3%BAde");
  });
  it("leva a ordem só quando não é a padrão (mais relevantes)", () => {
    expect(bookSearchHref("/aluno/livros", { sort: "relevance" })).toBe("/aluno/livros");
    expect(bookSearchHref("/aluno/livros", { sort: "title" })).toBe("/aluno/livros?ordem=title");
    expect(bookSearchHref("/aluno/livros", { query: "dom", sort: "author" })).toBe("/aluno/livros?q=dom&ordem=author");
  });
  it("só leva a página quando passa da primeira", () => {
    expect(bookSearchHref("/aluno/livros", { query: "dom", page: 1 })).toBe("/aluno/livros?q=dom");
    expect(bookSearchHref("/aluno/livros", { query: "dom", page: 3 })).toBe("/aluno/livros?q=dom&pagina=3");
  });
});

describe("paginateBySituation", () => {
  const livros = ["available", "unavailable", "available", "reserved", "available"].map((situation, id) => ({
    id,
    situation: situation as "available" | "unavailable" | "reserved",
  }));

  it("sem filtro devolve a página pedida e o total", () => {
    const result = paginateBySituation(livros, "all", 2, 2);
    expect(result.items.map((item) => item.id)).toEqual([2, 3]);
    expect(result).toMatchObject({ total: 5, page: 2 });
  });
  it("com filtro conta e pagina só os que combinam", () => {
    const result = paginateBySituation(livros, "available", 1, 2);
    expect(result.items.map((item) => item.id)).toEqual([0, 2]);
    expect(result.total).toBe(3);
  });
  it("página além do fim vale a última", () => {
    expect(paginateBySituation(livros, "all", 99, 2)).toMatchObject({ page: 3, items: [{ id: 4 }] });
  });
  it("sem resultado devolve lista vazia na página 1", () => {
    expect(paginateBySituation([], "reserved", 5, 6)).toEqual({ items: [], total: 0, page: 1 });
  });
});

describe("parseAvailabilityFilter", () => {
  it("lê as três situações e trata o resto como todos", () => {
    expect(parseAvailabilityFilter({ situacao: "available" })).toBe("available");
    expect(parseAvailabilityFilter({ situacao: "unavailable" })).toBe("unavailable");
    expect(parseAvailabilityFilter({ situacao: ["reserved", "x"] })).toBe("reserved");
    expect(parseAvailabilityFilter({ situacao: "x" })).toBe("all");
    expect(parseAvailabilityFilter({})).toBe("all");
  });
  it("não aceita 'inactive' nem texto parecido, só a lista", () => {
    expect(parseAvailabilityFilter({ situacao: "inactive" })).toBe("all");
    expect(parseAvailabilityFilter({ situacao: "Available" })).toBe("all");
    expect(parseAvailabilityFilter({ situacao: "constructor" })).toBe("all");
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

describe("parseBookSort", () => {
  it("lê as quatro ordens e trata o resto como mais relevantes", () => {
    expect(parseBookSort({ ordem: "author" })).toBe("author");
    expect(parseBookSort({ ordem: "relevance" })).toBe("relevance");
    expect(parseBookSort({ ordem: "available" })).toBe("available");
    expect(parseBookSort({ ordem: ["title", "x"] })).toBe("title");
    expect(parseBookSort({ ordem: "x" })).toBe("relevance");
    expect(parseBookSort({ ordem: "constructor" })).toBe("relevance");
    expect(parseBookSort({})).toBe("relevance");
  });
});

describe("sortBooks", () => {
  const livros = [
    { title: "Zoologia", author: "Ana", situation: "unavailable" as const },
    { title: "Álgebra", author: "Zélia", situation: "available" as const },
    { title: "Biologia", author: "Ana", situation: "reserved" as const },
    { title: "Cálculo", author: "Mário", situation: "available" as const },
  ];

  it("por título, com acento no lugar certo", () => {
    expect(sortBooks(livros, "title").map((l) => l.title)).toEqual(["Álgebra", "Biologia", "Cálculo", "Zoologia"]);
  });
  it("por autor, e o empate sai pelo título", () => {
    expect(sortBooks(livros, "author").map((l) => l.title)).toEqual(["Biologia", "Zoologia", "Cálculo", "Álgebra"]);
  });
  it("disponíveis primeiro, depois reservados e emprestados", () => {
    expect(sortBooks(livros, "available").map((l) => l.title)).toEqual(["Álgebra", "Cálculo", "Biologia", "Zoologia"]);
  });
  it("mais relevantes sem busca fica por título", () => {
    expect(sortBooks(livros, "relevance").map((l) => l.title)).toEqual(["Álgebra", "Biologia", "Cálculo", "Zoologia"]);
  });
  it("mais relevantes põe título igual, depois começo, palavra, trecho e autor, sem ligar para acento", () => {
    const achados = [
      { title: "Teoria dos Jogos", author: "Fiani", situation: "available" as const },
      { title: "Introdução à Teoria", author: "Souza", situation: "available" as const },
      { title: "Prática", author: "Ana Teoria", situation: "available" as const },
      { title: "Teoria", author: "Lima", situation: "available" as const },
      { title: "Metateoria", author: "Costa", situation: "available" as const },
    ];
    expect(sortBooks(achados, "relevance", "teoria").map((l) => l.title)).toEqual([
      "Teoria",
      "Teoria dos Jogos",
      "Introdução à Teoria",
      "Metateoria",
      "Prática",
    ]);
    expect(sortBooks(achados, "relevance", "INTRODUCAO")[0].title).toBe("Introdução à Teoria");
  });
  it("não altera a lista recebida", () => {
    const copia = livros.map((l) => l.title);
    sortBooks(livros, "author");
    expect(livros.map((l) => l.title)).toEqual(copia);
  });
});

describe("formatBrazilDate", () => {
  it("usa o horário de Brasília, não o do servidor", () => {
    expect(formatBrazilDate("2026-11-10T14:00:00Z")).toBe("10/11/2026");
    // 23h59 em Brasília já é o dia seguinte em UTC.
    expect(formatBrazilDate("2026-11-10T02:59:00Z")).toBe("09/11/2026");
  });
});

describe("catalogRows", () => {
  const empty = { code: "T-001", isbn: null, publisher: null, publicationYear: null, shelfLocation: null, cdd: null };

  it("livro sem dados de catálogo mostra só o código", () => {
    expect(catalogRows(empty)).toEqual([["Código", "T-001"]]);
  });

  it("mostra só as linhas preenchidas, na ordem do frame, com o ano como texto", () => {
    expect(catalogRows({ ...empty, isbn: "978-85-209-1000-0", publicationYear: 1956, cdd: "869.3" })).toEqual([
      ["Código", "T-001"],
      ["ISBN", "978-85-209-1000-0"],
      ["Ano", "1956"],
      ["CDD", "869.3"],
    ]);
  });
});
