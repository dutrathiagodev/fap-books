import { ACERVO_PATH } from "../access/access-rules";
import type { BookAvailabilityFilter, BookListFilters, BookSituation, BookStatus, BookStatusFilter } from "@/types/book";

// Exemplares na estante: a disponibilidade não é guardada, é calculada (total menos empréstimos em aberto).
export function availableCopies(quantity: number, openLoans: number): number {
  return Math.max(0, quantity - openLoans);
}

// Situação do título na estante. Emprestado (unavailable) = nenhum exemplar livre. Reservado = ainda há exemplar
// livre, mas ele está guardado para uma reserva ativa (aguardando ou pronta).
export function bookSituation(book: {
  quantity: number;
  openLoans: number;
  status: BookStatus;
  hasActiveReservation: boolean;
}): BookSituation {
  if (book.status === "inactive") return "inactive";
  if (availableCopies(book.quantity, book.openLoans) === 0) return "unavailable";
  return book.hasActiveReservation ? "reserved" : "available";
}

export type SituationCounts = Record<Exclude<BookSituation, "inactive">, number>;

// Deixa na busca só letras, números, espaço, ponto e hífen. O resto vira espaço, inclusive curinga, aspas e sinais de
// comando SQL. Hífens repetidos viram um só. O texto ainda vai ao banco como parâmetro (a função search_books escapa
// "%" e "_" por conta própria); esta limpeza só evita lixo na busca.
export function cleanSearchTerm(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .replace(/-{2,}/g, "-")
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

const BOOK_SORTS = ["relevance", "title", "author", "available"] as const;

// Ordem dos resultados da pesquisa: mais relevantes (padrão), título, autor ou disponíveis primeiro.
export type BookSort = (typeof BOOK_SORTS)[number];

// Estado da barra de busca da pesquisa de livros (Figma, card 0109): texto, categoria, STATUS e ordem.
export interface BookSearchState {
  query: string;
  category: string;
  availability: BookAvailabilityFilter;
  sort: BookSort;
}

const AVAILABILITY_FILTERS = ["available", "unavailable", "reserved"] as const;

// Lê o STATUS do endereço (?situacao=available|unavailable|reserved). Só aceita valor da lista; o resto vale "todos".
export function parseAvailabilityFilter(params: RawParams): BookAvailabilityFilter {
  const value = first(params.situacao);
  return AVAILABILITY_FILTERS.find((option) => option === value) ?? "all";
}

// Lê a ordem do endereço (?ordem=relevance|title|author|available). Só aceita valor da lista; o resto vale "mais relevantes".
export function parseBookSort(params: RawParams): BookSort {
  const value = first(params.ordem);
  return BOOK_SORTS.find((option) => option === value) ?? "relevance";
}

// Data no fuso de Brasília: o servidor roda em UTC, e uma devolução prevista para a noite de um dia cairia no dia seguinte.
export function formatBrazilDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// Monta o endereço de uma pesquisa mantendo só o que tem valor. Sem `page`, a busca volta para a primeira página
// (o endereço não leva ?pagina=).
export function bookSearchHref(basePath: string, state: Partial<BookSearchState> & { page?: number }): string {
  const search = new URLSearchParams();
  if (state.query) search.set("q", state.query);
  if (state.category) search.set("categoria", state.category);
  if (state.availability && state.availability !== "all") search.set("situacao", state.availability);
  if (state.sort && state.sort !== "relevance") search.set("ordem", state.sort);
  if (state.page && state.page > 1) search.set("pagina", String(state.page));
  const text = search.toString();
  return text ? `${basePath}?${text}` : basePath;
}

export type PageItem = number | "…";

// Números da paginação: primeira, última, atual e vizinhas. Buraco de uma página mostra o número; maior, mostra "…".
export function pageNumbers(current: number, total: number): PageItem[] {
  const shown = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const items: PageItem[] = [];
  shown.forEach((page, index) => {
    const gap = index === 0 ? 0 : page - shown[index - 1];
    if (gap === 2) items.push(page - 1);
    else if (gap > 2) items.push("…");
    items.push(page);
  });
  return items;
}

// Monta o endereço da listagem mantendo só os filtros que têm valor.
export function booksHref(filters: Partial<BookListFilters>): string {
  const search = new URLSearchParams();
  if (filters.query) search.set("q", filters.query);
  if (filters.category) search.set("categoria", filters.category);
  if (filters.status && filters.status !== "all") search.set("status", filters.status);
  if (filters.page && filters.page > 1) search.set("pagina", String(filters.page));
  const text = search.toString();
  return text ? `${ACERVO_PATH}?${text}` : ACERVO_PATH;
}

// Linhas do "Dados do catálogo" da página de detalhe: só entram as que o livro tem.
export function catalogRows(book: {
  code: string;
  isbn: string | null;
  publisher: string | null;
  publicationYear: number | null;
  shelfLocation: string | null;
  cdd: string | null;
}): Array<[string, string]> {
  const rows: Array<[string, string | number | null]> = [
    ["Código", book.code],
    ["ISBN", book.isbn],
    ["Editora", book.publisher],
    ["Ano", book.publicationYear],
    ["Localização", book.shelfLocation],
    ["CDD", book.cdd],
  ];
  return rows.filter((row): row is [string, string | number] => row[1] !== null).map(([label, value]) => [label, String(value)]);
}
