import { describe, expect, it } from "vitest";
import { ACERVO_PATH, ROLE_LABELS, decideRoute, safeNextPath } from "./access-rules";

describe("decideRoute", () => {
  it("manda quem não está logado para /login", () => {
    expect(decideRoute("/aluno", null)).toEqual({ action: "redirect", to: "/login?next=%2Faluno" });
    expect(decideRoute("/funcionario/acervo", null, "?q=dom")).toEqual({ action: "redirect", to: "/login?next=%2Ffuncionario%2Facervo%3Fq%3Ddom" });
  });

  it("deixa o visitante abrir endereço que não existe, para cair no 404 (card 0241)", () => {
    expect(decideRoute("/livros", null)).toEqual({ action: "allow" });
    expect(decideRoute("/xyz", null)).toEqual({ action: "allow" });
  });

  it("deixa quem não está logado abrir a landing page na raiz", () => {
    expect(decideRoute("/", null)).toEqual({ action: "allow" });
  });

  it("deixa quem não está logado abrir o /login", () => {
    expect(decideRoute("/login", null)).toEqual({ action: "allow" });
  });

  it("deixa quem não está logado abrir as boas-vindas do celular", () => {
    expect(decideRoute("/boas-vindas", null)).toEqual({ action: "allow" });
    expect(decideRoute("/boas-vindas", "student")).toEqual({ action: "redirect", to: "/aluno/livros" });
  });

  it("deixa qualquer pessoa abrir o aviso de privacidade", () => {
    expect(decideRoute("/privacidade", null)).toEqual({ action: "allow" });
    expect(decideRoute("/privacidade", "student")).toEqual({ action: "allow" });
    expect(decideRoute("/privacidadex", null)).toEqual({ action: "allow" });
  });

  it("deixa qualquer pessoa abrir termos, acessibilidade e suporte", () => {
    for (const path of ["/termos", "/acessibilidade", "/suporte"]) {
      expect(decideRoute(path, null)).toEqual({ action: "allow" });
      expect(decideRoute(path, "teacher")).toEqual({ action: "allow" });
    }
    expect(decideRoute("/termosx", null)).toEqual({ action: "allow" });
  });

  it("deixa qualquer pessoa abrir /definir-senha (convite), logada ou não", () => {
    expect(decideRoute("/definir-senha", null)).toEqual({ action: "allow" });
    expect(decideRoute("/definir-senha", "librarian")).toEqual({ action: "allow" });
    expect(decideRoute("/definir-senhax", null)).toEqual({ action: "allow" });
  });

  it("deixa cada perfil abrir a própria área, inclusive subpáginas", () => {
    expect(decideRoute("/aluno", "student")).toEqual({ action: "allow" });
    expect(decideRoute("/professor/reservas", "teacher")).toEqual({ action: "allow" });
    expect(decideRoute("/aluno/livros", "student")).toEqual({ action: "allow" });
    expect(decideRoute("/professor/livros", "teacher")).toEqual({ action: "allow" });
    expect(decideRoute("/funcionario/livros/novo", "librarian")).toEqual({ action: "allow" });
  });

  it("bloqueia a área de outro perfil e volta para a própria", () => {
    expect(decideRoute("/funcionario", "student")).toEqual({ action: "redirect", to: "/aluno" });
    expect(decideRoute("/funcionario", "teacher")).toEqual({ action: "redirect", to: "/professor" });
    expect(decideRoute("/aluno", "librarian")).toEqual({ action: "redirect", to: "/funcionario" });
    expect(decideRoute("/aluno/livros", "teacher")).toEqual({ action: "redirect", to: "/professor" });
    expect(decideRoute("/professor/livros", "student")).toEqual({ action: "redirect", to: "/aluno" });
  });

  it("manda quem já está logado do /login e da raiz para a primeira tela do perfil (o aluno não cai em Minha área)", () => {
    expect(decideRoute("/login", "student")).toEqual({ action: "redirect", to: "/aluno/livros" });
    expect(decideRoute("/", "librarian")).toEqual({ action: "redirect", to: "/funcionario/acervo" });
  });

  it("não confunde áreas com o mesmo começo de nome", () => {
    expect(decideRoute("/alunos-extra", "student")).toEqual({ action: "redirect", to: "/aluno/livros" });
  });
});

// A listagem do acervo fica dentro da área da bibliotecária: o proxy libera o caminho só para ela.
describe("ACERVO_PATH e ROLE_LABELS", () => {
  it("o acervo fica na área da funcionária", () => {
    expect(ACERVO_PATH).toBe("/funcionario/acervo");
    expect(decideRoute(ACERVO_PATH, "librarian")).toEqual({ action: "allow" });
    expect(decideRoute(ACERVO_PATH, "student")).toEqual({ action: "redirect", to: "/aluno" });
  });

  it("tem um rótulo para cada perfil", () => {
    expect(ROLE_LABELS).toEqual({ student: "Aluno", teacher: "Professor", librarian: "Funcionário" });
  });
});

describe("safeNextPath", () => {
  it("aceita caminho interno de área protegida, com parâmetros", () => {
    expect(safeNextPath("/funcionario/acervo?q=dom")).toBe("/funcionario/acervo?q=dom");
    expect(safeNextPath("/aluno/livros/abc")).toBe("/aluno/livros/abc");
  });

  it.each([null, undefined, "", "//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/login", "/", "/privacidade"])(
    "recusa %s (evita redirecionamento aberto)",
    (value) => expect(safeNextPath(value)).toBeNull(),
  );
});
