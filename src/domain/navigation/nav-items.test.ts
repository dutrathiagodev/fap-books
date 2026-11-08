import { describe, expect, it } from "vitest";
import { isActive, navItemsFor } from "./nav-items";

describe("navItemsFor", () => {
  it("aluno tem 4 itens, começando por Buscar livros (sem Início)", () => {
    const labels = navItemsFor("student").map((i) => i.label);
    expect(labels).toEqual(["Buscar livros", "Meus empréstimos", "Minhas reservas", "Multas"]);
  });

  it("professor tem os itens do aluno mais Reserva pedagógica", () => {
    const labels = navItemsFor("teacher").map((i) => i.label);
    expect(labels).toHaveLength(5);
    expect(labels.at(-1)).toBe("Reserva pedagógica");
  });

  it("funcionário tem 7 itens, começando por Acervo (o Painel volta com o card 0097)", () => {
    const labels = navItemsFor("librarian").map((i) => i.label);
    expect(labels).toHaveLength(7);
    expect(labels[0]).toBe("Acervo");
    expect(labels).not.toContain("Painel");
    expect(labels).not.toContain("Início");
  });

  it("aluno e professor têm a pesquisa de livros; a funcionária tem acervo, usuários, empréstimos, multas e histórico", () => {
    expect(navItemsFor("student").filter((i) => i.href).map((i) => i.href)).toEqual(["/aluno/livros"]);
    expect(navItemsFor("teacher").filter((i) => i.href).map((i) => i.href)).toEqual(["/professor/livros"]);
    expect(navItemsFor("librarian").filter((i) => i.href).map((i) => i.href)).toEqual([
      "/funcionario/acervo",
      "/funcionario/usuarios/novo",
      "/funcionario/emprestimos",
      "/funcionario/multas",
      "/funcionario/historico",
    ]);
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
