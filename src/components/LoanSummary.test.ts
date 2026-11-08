import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoanSummary } from "./LoanSummary";

const filled = {
  userName: "Lucas Andrade Martins",
  bookTitle: "Dom Casmurro",
  borrowedOn: "27/10/2026",
  dueOn: "03/11/2026",
};

describe("LoanSummary", () => {
  it("mostra usuário, livro, retirada e a data de devolução", () => {
    const html = renderToStaticMarkup(createElement(LoanSummary, filled));
    expect(html).toContain("Resumo do empréstimo");
    expect(html).toContain("Lucas Andrade Martins");
    expect(html).toContain("Dom Casmurro");
    expect(html).toContain("27/10/2026");
    expect(html).toContain("03/11/2026");
    expect(html).toContain("Confirmar empréstimo");
    expect(html).toContain("Voltar");
  });

  it("sem dados, explica que falta escolher usuário e livro", () => {
    const html = renderToStaticMarkup(createElement(LoanSummary, {}));
    expect(html).toContain("Nenhum empréstimo para resumir");
    expect(html).not.toContain("Confirmar empréstimo");
  });

  it("com erro, mostra a mensagem e desliga o confirmar", () => {
    const html = renderToStaticMarkup(createElement(LoanSummary, { ...filled, error: "Não foi possível calcular o prazo." }));
    expect(html).toContain("Não foi possível calcular o prazo.");
    expect(html).toContain("border-danger-700");
    expect(html).toContain("disabled");
  });

  it("com pendência, o confirmar fica desligado e sem o ícone", () => {
    const html = renderToStaticMarkup(createElement(LoanSummary, { ...filled, confirmDisabled: true }));
    expect(html).toContain("disabled");
    expect(html).not.toContain("<svg");
  });
});
