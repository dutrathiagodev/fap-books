import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BookListItem } from "@/types/book";
import { BookCover } from "./BookCover";
import { BooksTable } from "./BooksTable";

const book = (n: number, over: Partial<BookListItem> = {}): BookListItem => ({
  id: `id-${n}`,
  title: `Livro ${n}`,
  author: `Autor ${n}`,
  category: "Computação",
  code: `T-00${n}`,
  quantity: 2,
  status: "active",
  coverUrl: null,
  edition: null,
  publisher: null,
  openLoans: 1,
  hasActiveReservation: false,
  hasHistory: false,
  ...over,
});

const noop = async () => ({ ok: true as const });
const render = (books: BookListItem[]) => renderToStaticMarkup(createElement(BooksTable, { books, onDelete: noop, onInactivate: noop }));

describe("BooksTable (card 0239)", () => {
  it("tem uma só marcação por livro: uma tabela, sem a cópia em cartões do celular", () => {
    const out = render([book(1), book(2), book(3)]);
    expect(out.match(/<table/g)).toHaveLength(1);
    expect(out).not.toContain("<article");
    // 3 livros + a linha de cabeçalho.
    expect(out.match(/<tr/g)).toHaveLength(4);
    // Cada botão de ação existe uma vez por livro (Ver e Editar).
    expect(out.match(/aria-label="Ver Livro 1"/g)).toHaveLength(1);
    expect(out.match(/aria-label="Editar Livro 1"/g)).toHaveLength(1);
  });

  it("mostra título, autor, código e disponibilidade", () => {
    const out = render([book(1)]);
    expect(out).toContain("Livro 1");
    expect(out).toContain("Autor 1");
    expect(out).toContain("T-001");
    expect(out).toContain("1 / 2");
  });

  it("o botão de ação tem alvo de toque de 44 px no celular", () => {
    expect(render([book(1)])).toContain("row-icon-btn");
  });
});

describe("BookCover (card 0253)", () => {
  const cover = (props: { priority?: boolean }) =>
    renderToStaticMarkup(createElement(BookCover, { url: "https://x.test/c.jpg", className: "c", width: 56, height: 80, fallback: null, ...props }));

  it("a capa fora da primeira tela é preguiçosa e assíncrona", () => {
    const out = cover({});
    expect(out).toContain('loading="lazy"');
    expect(out).toContain('decoding="async"');
    expect(out).not.toContain("fetchPriority");
  });

  it("a capa da primeira tela carrega na hora e com prioridade", () => {
    const out = cover({ priority: true });
    expect(out).toContain('loading="eager"');
    expect(out).toContain('fetchPriority="high"');
  });

  it("sem endereço aparece só o espaço reservado", () => {
    expect(renderToStaticMarkup(createElement(BookCover, { url: null, className: "c", fallback: createElement("b", null, "sem capa") }))).toBe("<b>sem capa</b>");
  });
});
