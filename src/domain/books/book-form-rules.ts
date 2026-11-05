import type { BookFormField, BookFormValues, BookUpdateRow, NewBookRow } from "@/types/book";

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

// Mensagens do resultado do salvamento, iguais no cadastro e na edição (a edição acrescenta "not_found").
export const BOOK_FORM_MESSAGES = {
  duplicate_code: "Já existe um livro com esse código de chamada.",
  invalid: "Confira os campos destacados.",
  error: "Não foi possível salvar o livro. Tente novamente.",
} as const;

const LIMIT = { title: 200, authors: 200, callNumber: 40, publisher: 120, edition: 80 } as const;

// O frame do 0117 não limita a quantidade. O teto evita um número absurdo e está registrado no PR.
const MAX_COPIES = 9999;

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
  else if (!/^\d+$/.test(quantity) || !Number.isInteger(copies) || copies < 1) {
    errors.quantity = "Informe um número inteiro a partir de 1.";
  } else if (copies > MAX_COPIES) {
    errors.quantity = "Informe no máximo 9999 exemplares.";
  }

  if (values.circulation && !circulations.includes(values.circulation)) {
    errors.circulation = "Selecione o status do acervo.";
  }

  if (values.publisher.trim().length > LIMIT.publisher) errors.publisher = "O nome da editora é longo demais.";
  if (values.edition.trim().length > LIMIT.edition) errors.edition = "A edição é longa demais.";

  return errors;
}

const FORM_FIELDS = Object.keys(EMPTY_BOOK_FORM) as BookFormField[];

// O que chega a uma Server Action é qualquer coisa que o cliente mandou: só segue se todos os campos forem texto.
export function parseBookForm(input: unknown): BookFormValues | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const values = {} as BookFormValues;
  for (const field of FORM_FIELDS) {
    const value = record[field];
    if (typeof value !== "string") return null;
    values[field] = value;
  }
  return values;
}

// O código de chamada junta a CDD (assunto) e a notação do autor, como "612.01 G993t". Só a parte da CDD vai
// para books.cdd; sem número no começo não há CDD para guardar.
export function cddFromCallNumber(callNumber: string): string | null {
  return /^\d{3}(?:\.\d+)?/.exec(callNumber.trim())?.[0] ?? null;
}

// Linha de public.books para um formulário já validado. O código de chamada vira o código único do livro; o ISBN
// é guardado só com dígitos; o status "Circulação geral" é o livro ativo.
export function toBookRow(values: BookFormValues): NewBookRow {
  return { ...toBookUpdate(values), status: "active" };
}

// Mesma linha sem o status: editar um livro inativo não o reativa.
export function toBookUpdate(values: BookFormValues): BookUpdateRow {
  const isbn = digits(values.isbn);
  return {
    title: values.title.trim(),
    author: values.authors.trim(),
    category: values.category,
    code: values.callNumber.trim(),
    cdd: cddFromCallNumber(values.callNumber),
    isbn: isbn || null,
    quantity: Number(values.quantity.trim()),
    publisher: values.publisher.trim() || null,
    edition: values.edition.trim() || null,
  };
}

// Linha de public.books de volta para os campos do formulário de edição.
export function toBookFormValues(row: {
  title: string;
  author: string;
  category: string | null;
  code: string;
  isbn: string | null;
  quantity: number;
  publisher: string | null;
  edition: string | null;
}): BookFormValues {
  return {
    title: row.title,
    authors: row.author,
    category: row.category ?? "",
    callNumber: row.code,
    isbn: row.isbn ?? "",
    quantity: String(row.quantity),
    circulation: BOOK_CIRCULATION[0],
    publisher: row.publisher ?? "",
    edition: row.edition ?? "",
  };
}

// Não dá para ter menos exemplares do que os que estão emprestados agora.
export function quantityBelowOpenLoans(quantity: number, openLoans: number): boolean {
  return quantity < openLoans;
}
