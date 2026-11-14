import { describe, expect, it } from "vitest";
import { describeServerError } from "./error-log";

const context = { routePath: "/aluno/livros/[id]", routeType: "render" };

describe("describeServerError", () => {
  it("guarda digest, tipo, rota e método", () => {
    const error = Object.assign(new TypeError("falhou"), { digest: "1234567890" });
    expect(describeServerError(error, { path: "/aluno/livros/abc", method: "GET" }, context)).toEqual({
      evento: "erro_servidor",
      digest: "1234567890",
      tipo: "TypeError",
      rota: "/aluno/livros/[id]",
      contexto: "render",
      metodo: "GET",
      caminho: "/aluno/livros/abc",
    });
  });

  it("nunca leva a mensagem do erro nem a query string (podem ter e-mail, nome ou busca)", () => {
    const error = new Error("duplicate key maria@escola.com 20180849");
    const event = describeServerError(error, { path: "/funcionario/usuarios?q=Maria%20Souza#x", method: "POST" }, context);
    const text = JSON.stringify(event);
    expect(text).not.toContain("maria@escola.com");
    expect(text).not.toContain("20180849");
    expect(text).not.toContain("Maria");
    expect(event.caminho).toBe("/funcionario/usuarios");
  });

  it("aceita valor que não é Error e limita o tamanho dos textos", () => {
    const event = describeServerError("texto solto", { path: "/" + "a".repeat(500), method: "GET" }, context);
    expect(event.tipo).toBe("desconhecido");
    expect(event.digest).toBeNull();
    expect(event.caminho.length).toBeLessThanOrEqual(120);
  });
});
