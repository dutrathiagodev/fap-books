import type { BookListFilters, BookStatus, BookStatusFilter } from "@/types/book";

export type BookAvailability = "available" | "unavailable" | "inactive";

// Exemplares na estante: a disponibilidade não é guardada, é calculada (total menos empréstimos em aberto).
export function availableCopies(quantity: number, openLoans: number): number {
  return Math.max(0, quantity - openLoans);
}

export function bookAvailability(book: { quantity: number; openLoans: number; status: BookStatus }): BookAvailability {
  if (book.status === "inactive") return "inactive";
  return availableCopies(book.quantity, book.openLoans) > 0 ? "available" : "unavailable";
}

// Tira da busca os caracteres que têm função no filtro do banco (vírgula, parênteses, curinga, aspas).
export function cleanSearchTerm(raw: string): string {
  return raw
    .replace(/[,()*%\\:"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

// A exclusão só libera quando a pessoa digita o nome do livro (sem diferenciar maiúsculas).
export function confirmsTitle(typed: string, title: string): boolean {
  return normalize(title) !== "" && normalize(typed) === normalize(title);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// Lê os filtros do endereço (?q=&categoria=&status=&pagina=). Valor estranho vira o padrão.
export function parseBookFilters(params: RawParams): BookListFilters {
  const status = first(params.status);
  const page = Number.parseInt(first(params.pagina), 10);
  return {
    query: cleanSearchTerm(first(params.q)),
    category: first(params.categoria).trim().slice(0, 60),
    status: (["active", "inactive"].includes(status) ? status : "all") as BookStatusFilter,
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 10000) : 1,
  };
}

// Monta o endereço da listagem mantendo só os filtros que têm valor.
export function booksHref(filters: Partial<BookListFilters>): string {
  const search = new URLSearchParams();
  if (filters.query) search.set("q", filters.query);
  if (filters.category) search.set("categoria", filters.category);
  if (filters.status && filters.status !== "all") search.set("status", filters.status);
  if (filters.page && filters.page > 1) search.set("pagina", String(filters.page));
  const text = search.toString();
  return text ? `/funcionario/acervo?${text}` : "/funcionario/acervo";
}
