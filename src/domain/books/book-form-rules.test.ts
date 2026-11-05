import { describe, expect, it } from "vitest";
import {
  BOOK_AREAS,
  BOOK_CIRCULATION,
  EMPTY_BOOK_FORM,
  bookFormErrors,
  isBookFormEmpty,
  parseBookForm,
  quantityBelowOpenLoans,
  toBookFormValues,
  cddFromCallNumber,
  toBookRow,
  toBookUpdate,
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
      cdd: "612.01",
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

describe("cddFromCallNumber", () => {
  it("guarda só a classificação do código de chamada", () => {
    expect(cddFromCallNumber("612.01 G993t")).toBe("612.01");
    expect(cddFromCallNumber(" 004 S697e ")).toBe("004");
    expect(cddFromCallNumber("004.6")).toBe("004.6");
  });
  it("não inventa CDD quando o código não começa com número", () => {
    expect(cddFromCallNumber("G993t")).toBeNull();
    expect(cddFromCallNumber("12 abc")).toBeNull();
  });
});

describe("toBookUpdate", () => {
  it("é a linha do cadastro sem o status, para não reativar livro inativo", () => {
    const { status, ...rest } = toBookRow(filled);
    expect(status).toBe("active");
    expect(toBookUpdate(filled)).toEqual(rest);
    expect(toBookUpdate(filled)).not.toHaveProperty("status");
  });
});

describe("toBookFormValues", () => {
  it("devolve os campos do formulário e troca nulos por texto vazio", () => {
    const values = toBookFormValues({
      title: "Tratado",
      author: "Guyton",
      category: null,
      code: "612.01 G993t",
      isbn: null,
      quantity: 3,
      publisher: null,
      edition: "13ª edição",
    });
    expect(values).toEqual({
      ...EMPTY_BOOK_FORM,
      title: "Tratado",
      authors: "Guyton",
      callNumber: "612.01 G993t",
      quantity: "3",
      edition: "13ª edição",
    });
  });
  it("o que sai do banco passa nas regras do formulário", () => {
    expect(bookFormErrors(toBookFormValues({ ...toBookUpdate(filled), category: filled.category, code: "X1" }))).toEqual({});
  });
});

describe("quantityBelowOpenLoans", () => {
  it("só recusa quantidade menor que os empréstimos em aberto", () => {
    expect(quantityBelowOpenLoans(1, 2)).toBe(true);
    expect(quantityBelowOpenLoans(2, 2)).toBe(false);
    expect(quantityBelowOpenLoans(5, 0)).toBe(false);
  });
});
