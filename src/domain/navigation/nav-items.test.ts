import { describe, expect, it } from "vitest";
import { isActive, navItemsFor } from "./nav-items";

describe("navItemsFor", () => {
  it("aluno tem 5 itens, começando por Minha área", () => {
    const labels = navItemsFor("student").map((i) => i.label);
    expect(labels).toEqual(["Minha área", "Buscar livros", "Meus empréstimos", "Minhas reservas", "Multas"]);
  });

  it("professor tem os itens do aluno mais Reserva pedagógica", () => {
    const labels = navItemsFor("teacher").map((i) => i.label);
    expect(labels).toHaveLength(5);
    expect(labels.at(-1)).toBe("Reserva pedagógica");
  });

  it("funcionário tem 8 itens, começando por Painel e Acervo (sem Início)", () => {
    const labels = navItemsFor("librarian").map((i) => i.label);
    expect(labels).toHaveLength(8);
    expect(labels.slice(0, 2)).toEqual(["Painel", "Acervo"]);
    expect(labels).not.toContain("Início");
  });

  it("aluno tem a pesquisa; professor, a pesquisa e a reserva pedagógica; a funcionária, as telas já entregues", () => {
    expect(navItemsFor("student").filter((i) => i.href).map((i) => i.href)).toEqual([
      "/aluno",
      "/aluno/livros",
      "/aluno/emprestimos",
      "/aluno/reservas",
      "/aluno/multas",
    ]);
    expect(navItemsFor("teacher").filter((i) => i.href).map((i) => i.href)).toEqual([
      "/professor/livros",
      "/professor/reserva-pedagogica",
    ]);
    expect(navItemsFor("librarian").filter((i) => i.href).map((i) => i.href)).toEqual([
      "/funcionario/painel",
      "/funcionario/acervo",
      "/funcionario/usuarios",
      "/funcionario/emprestimos",
      "/funcionario/reservas-pedagogicas",
      "/funcionario/multas",
      "/funcionario/historico",
    ]);
  });

  it("a funcionária tem os grupos Operação (5 itens) e Gestão (3 itens), como no Figma; aluno e professor não têm grupo", () => {
    const groups = navItemsFor("librarian").map((i) => i.group);
    expect(groups).toEqual(["Operação", "Operação", "Operação", "Operação", "Operação", "Gestão", "Gestão", "Gestão"]);
    expect(navItemsFor("student").every((i) => i.group === undefined)).toBe(true);
    expect(navItemsFor("teacher").every((i) => i.group === undefined)).toBe(true);
  });

  it("nenhum perfil repete item", () => {
    for (const role of ["student", "teacher", "librarian"] as const) {
      const keys = navItemsFor(role).map((i) => i.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe("isActive", () => {
  const home = { key: "home" as const, label: "Início", href: "/aluno" };

  it("o início só fica ativo nele mesmo, não nas telas dentro da área", () => {
    expect(isActive(home, "/aluno")).toBe(true);
    expect(isActive(home, "/aluno/livros")).toBe(false);
  });

  it("outros itens ficam ativos na própria página e nas subpáginas", () => {
    const books = { key: "books" as const, label: "Acervo", href: "/funcionario/acervo" };
    expect(isActive(books, "/funcionario/acervo")).toBe(true);
    expect(isActive(books, "/funcionario/acervo/novo")).toBe(true);
    expect(isActive(books, "/funcionario")).toBe(false);
  });

  it("não fica ativo em outra área nem com nome parecido", () => {
    expect(isActive(home, "/alunos")).toBe(false);
    expect(isActive(home, "/professor")).toBe(false);
  });

  it("item sem endereço nunca fica ativo", () => {
    expect(isActive({ key: "books", label: "Buscar livros" }, "/aluno")).toBe(false);
  });
});
