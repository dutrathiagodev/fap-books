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

// Contadores do topo do acervo. Livro inativo não entra em nenhum dos três.
export function countSituations(books: Parameters<typeof bookSituation>[0][]): SituationCounts {
  const counts: SituationCounts = { available: 0, unavailable: 0, reserved: 0 };
  for (const book of books) {
    const situation = bookSituation(book);
    if (situation !== "inactive") counts[situation] += 1;
  }
  return counts;
}

// Deixa na busca só letras, números, espaço, ponto e hífen. O resto vira espaço, inclusive o que tem função no filtro
// do banco (vírgula, parênteses, curinga, aspas) e sinais de comando SQL. Hífens repetidos viram um só.
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

const SITUATION_RANK: Record<BookSituation, number> = { available: 0, reserved: 1, unavailable: 2, inactive: 3 };

// Texto sem acento e em minúsculas, para comparar a busca com título e autor.
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

// Posição na relevância (menor = mais relevante): título igual à busca, título que começa com ela, título com uma
// palavra que começa com ela, título que a contém, autor que a contém e, por fim, o que casou só por código ou ISBN.
function relevanceRank(item: { title: string; author: string }, term: string): number {
  const title = fold(item.title);
  if (title === term) return 0;
  if (title.startsWith(term)) return 1;
  if (title.split(/\s+/).some((word) => word.startsWith(term))) return 2;
  if (title.includes(term)) return 3;
  return fold(item.author).includes(term) ? 4 : 5;
}

// Ordena os resultados. Em "relevance" vale a busca (sem busca, fica por título); em "available" os livros com exemplar
// livre vêm primeiro. Em toda ordem, o empate sai pelo título.
export function sortBooks<T extends { title: string; author: string; situation: BookSituation }>(
  items: T[],
  sort: BookSort,
  query = "",
): T[] {
  const byText = (a: string, b: string) => a.localeCompare(b, "pt-BR");
  const term = fold(query.trim());
  return [...items].sort((a, b) => {
    if (sort === "relevance" && term) return relevanceRank(a, term) - relevanceRank(b, term) || byText(a.title, b.title);
    if (sort === "author") return byText(a.author, b.author) || byText(a.title, b.title);
    if (sort === "available") return SITUATION_RANK[a.situation] - SITUATION_RANK[b.situation] || byText(a.title, b.title);
    return byText(a.title, b.title);
  });
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

// Aplica o STATUS escolhido e devolve só a página pedida. Se a página passar do fim, vale a última.
export function paginateBySituation<T extends { situation: BookSituation }>(
  items: T[],
  availability: BookAvailabilityFilter,
  page: number,
  pageSize: number,
): { items: T[]; total: number; page: number } {
  const matching = availability === "all" ? items : items.filter((item) => item.situation === availability);
  const lastPage = Math.max(1, Math.ceil(matching.length / pageSize));
  const current = Math.min(page, lastPage);
  return { items: matching.slice((current - 1) * pageSize, current * pageSize), total: matching.length, page: current };
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
