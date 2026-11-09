import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HelpAssistant } from "./HelpAssistant";

describe("HelpAssistant", () => {
  it("abre fechado: só o botão, com nome acessível e sem a janela da conversa", () => {
    const out = renderToStaticMarkup(createElement(HelpAssistant));
    expect(out).toContain('aria-label="Abrir ajuda"');
    expect(out).toContain('aria-expanded="false"');
    expect(out).not.toContain('role="dialog"');
    expect(out).toContain("print:hidden");
  });
});
