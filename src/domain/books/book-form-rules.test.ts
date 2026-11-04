import { describe, expect, it } from "vitest";
import {
  BOOK_AREAS,
  BOOK_CIRCULATION,
  EMPTY_BOOK_FORM,
  bookFormErrors,
  isBookFormEmpty,
  parseBookForm,
  toBookRow,
} from "./book-form-rules";

const filled = {
  ...EMPTY_BOOK_FORM,
  title: "Tratado de Fisiologia Médica",
  authors: "John E. Hall, Arthur C. Guyton",
  category: "Saúde",
  callNumber: "612.01 G993t",
  isbn: "978-85-352-8761-5",
  quantity: "1",
  publisher: "Elsevier",
  edition: "13ª edição (2021)",
};

describe("isBookFormEmpty", () => {
  it("reconhece o formulário do frame, só com quantidade 1", () => {
    expect(isBookFormEmpty(EMPTY_BOOK_FORM)).toBe(true);
  });
  it("deixa de ser vazio quando o título entra", () => {
    expect(isBookFormEmpty({ ...EMPTY_BOOK_FORM, title: "Dom Casmurro" })).toBe(false);
  });
});

describe("bookFormErrors", () => {
  it("aceita o exemplo do frame", () => {
    expect(bookFormErrors(filled)).toEqual({});
  });
  it("pede os obrigatórios quando estão vazios", () => {
    const errors = bookFormErrors({ ...EMPTY_BOOK_FORM, quantity: "", circulation: "" });
    expect(errors.title).toBe("Informe o título do livro.");
    expect(errors.authors).toBe("Informe o autor.");
    expect(errors.category).toBe("Selecione uma área.");
    expect(errors.callNumber).toBe("Informe o código de chamada.");
    expect(errors.quantity).toBe("Informe a quantidade de exemplares.");
    expect(errors.isbn).toBeUndefined();
    expect(errors.publisher).toBeUndefined();
  });
  it("recusa quantidade que não é inteiro a partir de 1", () => {
    expect(bookFormErrors({ ...filled, quantity: "0" }).quantity).toMatch(/inteiro/);
    expect(bookFormErrors({ ...filled, quantity: "2,5" }).quantity).toMatch(/inteiro/);
    expect(bookFormErrors({ ...filled, quantity: "3" }).quantity).toBeUndefined();
    expect(bookFormErrors({ ...filled, quantity: "9999" }).quantity).toBeUndefined();
    expect(bookFormErrors({ ...filled, quantity: "10000" }).quantity).toBe("Informe no máximo 9999 exemplares.");
  });
  it("aceita ISBN-13 com hífen e recusa um código curto", () => {
    expect(bookFormErrors({ ...filled, isbn: "" }).isbn).toBeUndefined();
    expect(bookFormErrors({ ...filled, isbn: "9788535287615" }).isbn).toBeUndefined();
    expect(bookFormErrors({ ...filled, isbn: "123" }).isbn).toMatch(/10 ou 13/);
  });
  it("sem áreas cadastradas o campo de categoria fica vazio de opções", () => {
    expect(bookFormErrors(filled, []).category).toBe("Nenhuma área disponível.");
  });
  it("as áreas e a circulação do frame estão na lista", () => {
    expect(BOOK_AREAS).toContain("Saúde");
    expect(BOOK_CIRCULATION).toContain("Circulação geral");
  });
});

describe("parseBookForm", () => {
  it("aceita o formulário completo", () => {
    expect(parseBookForm(filled)).toEqual(filled);
  });
  it("recusa o que não é objeto ou tem campo que não é texto", () => {
    expect(parseBookForm(null)).toBeNull();
    expect(parseBookForm("x")).toBeNull();
    expect(parseBookForm({ ...filled, quantity: 1 })).toBeNull();
    expect(parseBookForm({ ...filled, title: undefined })).toBeNull();
  });
});

describe("toBookRow", () => {
  it("mapeia o formulário para as colunas de books", () => {
    expect(toBookRow({ ...filled, title: "  Tratado  ", quantity: " 3 " })).toEqual({
      title: "Tratado",
      author: "John E. Hall, Arthur C. Guyton",
      category: "Saúde",
      code: "612.01 G993t",
      isbn: "9788535287615",
      quantity: 3,
      status: "active",
      publisher: "Elsevier",
      edition: "13ª edição (2021)",
    });
  });
  it("deixa nulos os opcionais em branco", () => {
    const row = toBookRow({ ...filled, isbn: " ", publisher: "", edition: "" });
    expect(row.isbn).toBeNull();
    expect(row.publisher).toBeNull();
    expect(row.edition).toBeNull();
  });
});
