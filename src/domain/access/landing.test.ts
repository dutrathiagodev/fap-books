import { describe, expect, it } from "vitest";
import { decideRoute, ROLE_HOME, ROLE_LANDING } from "./access-rules";

describe("primeira tela de cada perfil", () => {
  it("fica dentro da área do próprio perfil (a pessoa não é mandada para fora)", () => {
    for (const role of ["student", "teacher", "librarian"] as const) {
      expect(ROLE_LANDING[role].startsWith(`${ROLE_HOME[role]}/`)).toBe(true);
      expect(decideRoute(ROLE_LANDING[role], role)).toEqual({ action: "allow" });
    }
  });

  it("não deixa um perfil abrir a primeira tela de outro", () => {
    expect(decideRoute(ROLE_LANDING.librarian, "student")).toEqual({ action: "redirect", to: "/aluno" });
    expect(decideRoute(ROLE_LANDING.student, "librarian")).toEqual({ action: "redirect", to: "/funcionario" });
  });
});
