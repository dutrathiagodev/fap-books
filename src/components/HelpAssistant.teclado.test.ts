// @vitest-environment jsdom
// Balão de ajuda no teclado e nas quatro perguntas do card 0248 [FAP - 0248]. O texto das respostas já é testado em
// domain/help; aqui o que importa é a tela: foco, Esc e o botão do WhatsApp quando o assistente não sabe.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HelpAssistant } from "./HelpAssistant";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(HelpAssistant)));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const toggle = () => host.querySelector("button[aria-expanded]") as HTMLButtonElement;
const input = () => host.querySelector('input[aria-label="Sua pergunta"]') as HTMLInputElement;

function ask(text: string) {
  const field = input();
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setValue.call(field, text);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => (host.querySelector('button[aria-label="Enviar pergunta"]') as HTMLButtonElement).click());
}

function open() {
  act(() => toggle().click());
}

describe("HelpAssistant: teclado", () => {
  it("abre com o foco no campo de pergunta e o botão avisa que está expandido", () => {
    open();
    expect(document.activeElement).toBe(input());
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });

  it("Esc fecha e devolve o foco ao botão", () => {
    open();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(toggle());
  });
});

describe("HelpAssistant: as quatro perguntas do card 0248", () => {
  it.each([
    ["qual o horário", /segunda|sexta|aberta|fechada|horário/i],
    ["como renovar", /renov/i],
    ["como funciona a multa", /R\$ 1,00/],
  ])("%s tem resposta e não oferece o WhatsApp", (question, expected) => {
    open();
    ask(question);
    const log = host.querySelector('[role="log"]') as HTMLElement;
    expect(log.textContent).toMatch(expected);
    expect(log.querySelector("a[href*='wa.me']")).toBeNull();
  });

  it("'posso trazer meu cachorro?' não tem resposta pronta e abre o WhatsApp da biblioteca", () => {
    open();
    ask("posso trazer meu cachorro?");
    const link = host.querySelector('[role="log"] a') as HTMLAnchorElement;
    expect(link.href).toContain("wa.me");
    expect(decodeURIComponent(link.href)).toContain("posso trazer meu cachorro?");
  });
});
