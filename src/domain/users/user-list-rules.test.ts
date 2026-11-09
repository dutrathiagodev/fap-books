import { describe, expect, it } from "vitest";
import { parseUserFilters, roleLabel, userEmptyTexts, userHref, userSummary } from "./user-list-rules";

describe("parseUserFilters", () => {
  it("sem nada no endereço: todos, sem busca, página 1", () => {
    expect(parseUserFilters({})).toEqual({ role: "all", status: "all", query: "", page: 1 });
  });

  it("lê perfil, situação, busca e página", () => {
    expect(parseUserFilters({ perfil: "teacher", situacao: "inactive", q: " Ana  Souza ", pagina: "3" })).toEqual({
      role: "teacher",
      status: "inactive",
      query: "Ana Souza",
      page: 3,
    });
  });

  it("valor desconhecido ou malicioso cai no padrão", () => {
    const filters = parseUserFilters({ perfil: "admin", situacao: "x'; drop table", pagina: "-4" });
    expect(filters).toMatchObject({ role: "all", status: "all", page: 1 });
    expect(parseUserFilters({ pagina: "abc" }).page).toBe(1);
    expect(parseUserFilters({ pagina: "99999999" }).page).toBe(10000);
  });

  it("limpa a busca: sem curinga '*', sem controle, no máximo 60 letras", () => {
    expect(parseUserFilters({ q: "a*b\u0000c" }).query).toBe("a b c");
    expect(parseUserFilters({ q: "x".repeat(200) }).query).toHaveLength(60);
  });

  it("usa só o primeiro valor quando o parâmetro se repete", () => {
    expect(parseUserFilters({ perfil: ["student", "teacher"] }).role).toBe("student");
  });
});

describe("userHref", () => {
  it("o padrão não aparece no endereço", () => {
    expect(userHref({})).toBe("/funcionario/usuarios");
    expect(userHref({ role: "all", status: "all", page: 1, query: "" })).toBe("/funcionario/usuarios");
  });

  it("junta os filtros escolhidos", () => {
    expect(userHref({ role: "student", status: "active", query: "ana", page: 2 })).toBe(
      "/funcionario/usuarios?q=ana&perfil=student&situacao=active&pagina=2",
    );
  });

  it("codifica a busca", () => {
    expect(userHref({ query: "a&b=c" })).toBe("/funcionario/usuarios?q=a%26b%3Dc");
  });
});

describe("textos", () => {
  it("resumo da página", () => {
    expect(userSummary(1, 6, 240)).toBe("Mostrando 1-6 de 240 usuários");
    expect(userSummary(1, 1, 1)).toBe("Mostrando 1-1 de 1 usuário");
    expect(userSummary(0, 0, 0)).toBe("Nenhum usuário");
  });

  it("vazio sem filtro convida a cadastrar; com filtro ajuda a achar", () => {
    expect(userEmptyTexts(false).title).toBe("Nenhum usuário cadastrado");
    expect(userEmptyTexts(true).title).toBe("Nenhum usuário encontrado");
  });

  it("rótulo do perfil", () => {
    expect(roleLabel("all")).toBe("Todos");
    expect(roleLabel("librarian")).toBe("Funcionário da biblioteca");
  });
});
