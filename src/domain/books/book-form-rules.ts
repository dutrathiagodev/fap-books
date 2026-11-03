import type { BookFormField, BookFormValues } from "@/types/book";

// As sete áreas dos filtros do Figma (cards 0108, 0113 e 0117). O banco guarda o texto livre.
export const BOOK_AREAS = [
  "Literatura brasileira",
  "Computação",
  "Saúde",
  "Teologia",
  "Religião",
  "Metodologia",
  "Direito",
] as const;

// Única opção desenhada no frame do cadastro. O select nasce nela.
export const BOOK_CIRCULATION = ["Circulação geral"] as const;

export const EMPTY_BOOK_FORM: BookFormValues = {
  title: "",
  authors: "",
  category: "",
  callNumber: "",
  isbn: "",
  quantity: "1",
  circulation: BOOK_CIRCULATION[0],
  publisher: "",
  edition: "",
};

const LIMIT = { title: 200, authors: 200, callNumber: 40, publisher: 120, edition: 80 } as const;

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

// Formulário ainda no estado do frame vazio: só a quantidade 1 e a circulação padrão.
export function isBookFormEmpty(values: BookFormValues): boolean {
  const quantity = values.quantity.trim();
  return (
    values.title.trim() === "" &&
    values.authors.trim() === "" &&
    values.category === "" &&
    values.callNumber.trim() === "" &&
    values.isbn.trim() === "" &&
    (quantity === "" || quantity === "1") &&
    (values.circulation === "" || values.circulation === BOOK_CIRCULATION[0]) &&
    values.publisher.trim() === "" &&
    values.edition.trim() === ""
  );
}

// Mensagens do bloco. Campo obrigatório vazio, ISBN fora do padrão e quantidade que não é inteiro.
export function bookFormErrors(
  values: BookFormValues,
  areas: readonly string[] = BOOK_AREAS,
  circulations: readonly string[] = BOOK_CIRCULATION,
): Partial<Record<BookFormField, string>> {
  const errors: Partial<Record<BookFormField, string>> = {};

  const title = values.title.trim();
  if (!title) errors.title = "Informe o título do livro.";
  else if (title.length > LIMIT.title) errors.title = "O título é longo demais.";

  const authors = values.authors.trim();
  if (!authors) errors.authors = "Informe o autor.";
  else if (authors.length > LIMIT.authors) errors.authors = "A lista de autores é longa demais.";

  if (areas.length === 0) errors.category = "Nenhuma área disponível.";
  else if (!values.category) errors.category = "Selecione uma área.";
  else if (!areas.includes(values.category)) errors.category = "Selecione uma área da lista.";

  const callNumber = values.callNumber.trim();
  if (!callNumber) errors.callNumber = "Informe o código de chamada.";
  else if (callNumber.length > LIMIT.callNumber) errors.callNumber = "O código de chamada é longo demais.";

  const isbn = values.isbn.trim();
  if (isbn) {
    const count = digits(isbn).length;
    if (count !== 10 && count !== 13) errors.isbn = "Use um ISBN com 10 ou 13 dígitos.";
  }

  const quantity = values.quantity.trim();
  const copies = Number(quantity);
  if (!quantity) errors.quantity = "Informe a quantidade de exemplares.";
  else if (!/^\d+$/.test(quantity) || !Number.isInteger(copies) || copies < 1 || copies > 9999) {
    errors.quantity = "Informe um número inteiro a partir de 1.";
  }

  if (values.circulation && !circulations.includes(values.circulation)) {
    errors.circulation = "Selecione o status do acervo.";
  }

  if (values.publisher.trim().length > LIMIT.publisher) errors.publisher = "O nome da editora é longo demais.";
  if (values.edition.trim().length > LIMIT.edition) errors.edition = "A edição é longa demais.";

  return errors;
}
