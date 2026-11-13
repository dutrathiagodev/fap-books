// @vitest-environment jsdom
// Teclado e foco do Modal [FAP - 0248]: foco entra no modal, Tab fica preso dentro, Esc fecha (menos no destrutivo)
// e o foco volta para o botão que abriu. Roda num DOM de verdade (jsdom), com React 19.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Modal, type ModalProps } from "./Modal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

function mount(props: Partial<ModalProps> = {}) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const render = (open: boolean) =>
    act(() => {
      root.render(
        createElement(
          "div",
          null,
          createElement("button", { id: "abre" }, "Abrir"),
          createElement(Modal, { open, title: "Dar baixa", description: "Confirma?", confirmLabel: "Confirmar", onClose, onConfirm, ...props }),
        ),
      );
    });
  return { render, onClose, onConfirm };
}

function press(key: string, shiftKey = false) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }));
  });
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("Modal: teclado e foco", () => {
  it("é um diálogo modal nomeado pelo título", () => {
    const { render } = mount();
    render(true);
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const title = document.getElementById(dialog.getAttribute("aria-labelledby") ?? "");
    expect(title?.textContent).toBe("Dar baixa");
  });

  it("move o foco para dentro ao abrir", () => {
    const { render } = mount();
    render(true);
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect((document.activeElement as HTMLElement).getAttribute("aria-label")).toBe("Fechar");
  });

  it("Tab no último controle volta ao primeiro, e Shift+Tab no primeiro vai ao último", () => {
    const { render } = mount();
    render(true);
    const buttons = [...document.querySelectorAll<HTMLElement>('[role="dialog"] button')];
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    expect(last.textContent).toBe("Confirmar");

    last.focus();
    press("Tab");
    expect(document.activeElement).toBe(first);

    first.focus();
    press("Tab", true);
    expect(document.activeElement).toBe(last);
  });

  it("Esc fecha o modal comum", () => {
    const { render, onClose } = mount();
    render(true);
    press("Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Esc não fecha o modal destrutivo (o X continua fechando)", () => {
    const { render, onClose } = mount({ destructive: true });
    render(true);
    press("Escape");
    expect(onClose).not.toHaveBeenCalled();
    act(() => (document.querySelector('[aria-label="Fechar"]') as HTMLElement).click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("devolve o foco ao botão que abriu quando fecha", () => {
    const { render } = mount();
    render(false);
    const opener = document.getElementById("abre") as HTMLElement;
    opener.focus();
    render(true);
    expect(document.activeElement).not.toBe(opener);
    render(false);
    expect(document.activeElement).toBe(opener);
  });

  it("fechado, não existe no DOM", () => {
    const { render } = mount();
    render(false);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
