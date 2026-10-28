import { describe, expect, it } from "vitest";
import { isActive, navItemsFor } from "./nav-items";

describe("navItemsFor", () => {
  it("aluno tem 5 itens, começando por Início", () => {
    const labels = navItemsFor("student").map((i) => i.label);
    expect(labels).toEqual(["Início", "Buscar livros", "Meus empréstimos", "Minhas reservas", "Multas"]);
  });

  it("professor tem os itens do aluno mais Reserva pedagógica", () => {
    const labels = navItemsFor("teacher").map((i) => i.label);
    expect(labels).toHaveLength(6);
    expect(labels.at(-1)).toBe("Reserva pedagógica");
  });

  it("funcionário tem 8 itens, começando por Painel", () => {
    const labels = navItemsFor("librarian").map((i) => i.label);
    expect(labels).toHaveLength(8);
    expect(labels[0]).toBe("Painel");
    expect(labels).not.toContain("Início");
  });

  it("só o início tem endereço no aluno e no professor; a funcionária também tem o acervo", () => {
    expect(navItemsFor("student").filter((i) => i.href).map((i) => i.href)).toEqual(["/aluno"]);
    expect(navItemsFor("teacher").filter((i) => i.href).map((i) => i.href)).toEqual(["/professor"]);
    expect(navItemsFor("librarian").filter((i) => i.href).map((i) => i.href)).toEqual(["/funcionario", "/funcionario/acervo"]);
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
