import { describe, expect, it } from "vitest";
import { decideRoute } from "./access-rules";

describe("decideRoute", () => {
  it("manda quem não está logado para /login", () => {
    expect(decideRoute("/aluno", null)).toEqual({ action: "redirect", to: "/login" });
    expect(decideRoute("/", null)).toEqual({ action: "redirect", to: "/login" });
  });

  it("deixa quem não está logado abrir o /login", () => {
    expect(decideRoute("/login", null)).toEqual({ action: "allow" });
  });

  it("deixa cada perfil abrir a própria área, inclusive subpáginas", () => {
    expect(decideRoute("/aluno", "student")).toEqual({ action: "allow" });
    expect(decideRoute("/professor/reservas", "teacher")).toEqual({ action: "allow" });
    expect(decideRoute("/funcionario/livros/novo", "librarian")).toEqual({ action: "allow" });
  });

  it("bloqueia a área de outro perfil e volta para a própria", () => {
    expect(decideRoute("/funcionario", "student")).toEqual({ action: "redirect", to: "/aluno" });
    expect(decideRoute("/funcionario", "teacher")).toEqual({ action: "redirect", to: "/professor" });
    expect(decideRoute("/aluno", "librarian")).toEqual({ action: "redirect", to: "/funcionario" });
  });

  it("manda quem já está logado do /login e da raiz para a própria área", () => {
    expect(decideRoute("/login", "student")).toEqual({ action: "redirect", to: "/aluno" });
    expect(decideRoute("/", "librarian")).toEqual({ action: "redirect", to: "/funcionario" });
  });

  it("não confunde áreas com o mesmo começo de nome", () => {
    expect(decideRoute("/alunos-extra", "student")).toEqual({ action: "redirect", to: "/aluno" });
  });
});
