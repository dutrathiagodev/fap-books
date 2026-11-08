import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookCover } from "./BookCover";
import { PageError } from "./PageError";
import { TextLink } from "./TextLink";

// O React acrescenta um <link rel=preload> antes da imagem; por isso a conferência é do <img>.
// Garante que os componentes reaproveitados geram o mesmo HTML que as telas tinham antes da refatoração.
describe("BookCover", () => {
  const fallback = createElement("span", { className: "reservado" });

  it("desenha a imagem com as classes e as medidas da tela", () => {
    const html = renderToStaticMarkup(
      createElement(BookCover, { url: "https://x/capa.jpg", width: 32, height: 44, className: "h-11 w-8", fallback }),
    );
    expect(html).toContain('<img src="https://x/capa.jpg" alt="" width="32" height="44" loading="lazy" decoding="async" class="h-11 w-8"/>');
  });

  it("usa o texto alternativo quando a tela pede", () => {
    const html = renderToStaticMarkup(
      createElement(BookCover, { url: "https://x/capa.jpg", alt: "Capa de Dom Casmurro", className: "h-72", fallback }),
    );
    expect(html).toContain('<img src="https://x/capa.jpg" alt="Capa de Dom Casmurro" loading="lazy" decoding="async" class="h-72"/>');
  });

  it.each([null, undefined, ""])("sem capa (%s) mostra só o espaço reservado", (url) => {
    expect(renderToStaticMarkup(createElement(BookCover, { url, className: "h-11", fallback }))).toBe(
      '<span class="reservado"></span>',
    );
  });
});

describe("TextLink", () => {
  it("mantém as classes do link sublinhado", () => {
    expect(renderToStaticMarkup(TextLink({ href: "/a", children: "Limpar busca" }))).toBe(
      '<a class="text-sm font-medium text-link underline" href="/a">Limpar busca</a>',
    );
  });

  it("aceita classe extra de espaçamento", () => {
    expect(renderToStaticMarkup(TextLink({ href: "/a", className: "mt-2", children: "Voltar" }))).toContain(
      'class="mt-2 text-sm font-medium text-link underline"',
    );
  });
});

describe("PageError", () => {
  const props = { error: new Error("x"), reset: () => {} };

  it("usa o título padrão", () => {
    expect(renderToStaticMarkup(createElement(PageError, props))).toContain("Não foi possível abrir esta página");
  });

  it("mostra o título da área", () => {
    expect(renderToStaticMarkup(createElement(PageError, { ...props, title: "Não foi possível abrir o acervo" }))).toContain(
      "Não foi possível abrir o acervo",
    );
  });
});
