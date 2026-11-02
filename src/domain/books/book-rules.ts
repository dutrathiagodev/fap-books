import type { BookAvailabilityFilter, BookListFilters, BookStatus, BookStatusFilter } from "@/types/book";

export type BookAvailability = "available" | "unavailable" | "inactive";

// Exemplares na estante: a disponibilidade não é guardada, é calculada (total menos empréstimos em aberto).
export function availableCopies(quantity: number, openLoans: number): number {
  return Math.max(0, quantity - openLoans);
}

export function bookAvailability(book: { quantity: number; openLoans: number; status: BookStatus }): BookAvailability {
  if (book.status === "inactive") return "inactive";
  return availableCopies(book.quantity, book.openLoans) > 0 ? "available" : "unavailable";
}

// Reservado = ainda há exemplar na estante, mas ele está guardado para uma reserva ativa (aguardando ou pronta).
export type BookSituation = BookAvailability | "reserved";

export function bookSituation(book: {
  quantity: number;
  openLoans: number;
  status: BookStatus;
  hasActiveReservation: boolean;
}): BookSituation {
  const availability = bookAvailability(book);
  return availability === "available" && book.hasActiveReservation ? "reserved" : availability;
}

export interface SituationCounts {
  available: number;
  unavailable: number;
  reserved: number;
}

// Contadores do topo do acervo. Livro inativo não entra em nenhum dos três.
export function countSituations(books: Parameters<typeof bookSituation>[0][]): SituationCounts {
  const counts: SituationCounts = { available: 0, unavailable: 0, reserved: 0 };
  for (const book of books) {
    const situation = bookSituation(book);
    if (situation !== "inactive") counts[situation] += 1;
  }
  return counts;
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

// Estado da barra de busca da pesquisa de livros (Figma, card 0109): texto, categoria e STATUS.
export interface BookSearchState {
  query: string;
  category: string;
  availability: BookAvailabilityFilter;
}

const AVAILABILITY_PARAM: Record<Exclude<BookAvailabilityFilter, "all">, string> = {
  available: "disponivel",
  borrowed: "emprestado",
  reserved: "reservado",
};

// Lê o STATUS do endereço (?situacao=disponivel|emprestado|reservado). Valor estranho vale "todos".
export function parseAvailabilityFilter(params: RawParams): BookAvailabilityFilter {
  const value = first(params.situacao);
  const found = (Object.keys(AVAILABILITY_PARAM) as Array<keyof typeof AVAILABILITY_PARAM>).find(
    (key) => AVAILABILITY_PARAM[key] === value,
  );
  return found ?? "all";
}

// Monta o endereço de uma pesquisa mantendo só o que tem valor. Mudar a busca volta para a primeira página
// (o endereço não leva ?pagina=).
export function bookSearchHref(basePath: string, state: Partial<BookSearchState>): string {
  const search = new URLSearchParams();
  if (state.query) search.set("q", state.query);
  if (state.category) search.set("categoria", state.category);
  if (state.availability && state.availability !== "all") search.set("situacao", AVAILABILITY_PARAM[state.availability]);
  const text = search.toString();
  return text ? `${basePath}?${text}` : basePath;
}

// Valor do ?situacao= de cada opção (o formulário de busca guarda o STATUS ativo num campo escondido).
export function availabilityParam(availability: Exclude<BookAvailabilityFilter, "all">): string {
  return AVAILABILITY_PARAM[availability];
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
  return text ? `/funcionario/acervo?${text}` : "/funcionario/acervo";
}
