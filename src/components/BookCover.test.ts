// @vitest-environment jsdom
// Capa lenta ou quebrada [FAP - 0248]: se a imagem falhar, aparece o espaço reservado, não o ícone de imagem quebrada.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BookCover } from "./BookCover";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const fallback = createElement("span", { "data-testid": "sem-capa" }, "sem capa");
const render = (url: string | null) =>
  act(() => root.render(createElement(BookCover, { url, alt: "Capa", className: "c", fallback })));

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("BookCover", () => {
  it("sem endereço mostra o espaço reservado", () => {
    render(null);
    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector('[data-testid="sem-capa"]')).not.toBeNull();
  });

  it("com endereço mostra a imagem carregando só quando perto da tela", () => {
    render("https://x.test/a.png");
    const img = host.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");
    expect(img.getAttribute("alt")).toBe("Capa");
  });

  it("imagem que falha troca pelo espaço reservado", () => {
    render("https://x.test/quebrada.png");
    act(() => {
      host.querySelector("img")!.dispatchEvent(new Event("error"));
    });
    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector('[data-testid="sem-capa"]')).not.toBeNull();
  });

  it("se o livro ganhar outra capa depois da falha, a nova é tentada", () => {
    render("https://x.test/quebrada.png");
    act(() => {
      host.querySelector("img")!.dispatchEvent(new Event("error"));
    });
    render("https://x.test/nova.png");
    expect(host.querySelector("img")?.getAttribute("src")).toBe("https://x.test/nova.png");
  });
});
