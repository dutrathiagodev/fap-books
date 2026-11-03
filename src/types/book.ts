// Situação do livro no catálogo (igual ao check de books.status no banco).
export type BookStatus = "active" | "inactive";

export type BookStatusFilter = "all" | BookStatus;

// Situação do título na estante: unavailable = emprestado (sem exemplar livre), reserved = exemplar livre guardado para reserva.
export type BookSituation = "available" | "unavailable" | "reserved" | "inactive";

// Filtro STATUS da pesquisa de livros (Figma, card 0108): todos, disponível, emprestado ou reservado.
export type BookAvailabilityFilter = "all" | Exclude<BookSituation, "inactive">;

// Uma linha da listagem do acervo (Figma, card 0113).
export interface BookListItem {
  id: string;
  title: string;
  author: string;
  category: string | null;
  code: string;
  quantity: number;
  status: BookStatus;
  coverUrl: string | null;
  // Exemplares emprestados agora (empréstimos sem devolução).
  openLoans: number;
  // Tem reserva aguardando ou pronta para retirada (guarda um exemplar).
  hasActiveReservation: boolean;
  // Já teve empréstimo, reserva ou reserva pedagógica: não pode ser excluído, só inativado.
  hasHistory: boolean;
}

// Um livro nos resultados da pesquisa de alunos e professores (Figma, card 0108).
export interface BookSearchItem {
  id: string;
  title: string;
  author: string;
  category: string | null;
  code: string;
  coverUrl: string | null;
  situation: BookSituation;
  // Exemplares na estante agora.
  freeCopies: number;
  // Menor data de devolução prevista entre os empréstimos em aberto (ISO); vazio se não há empréstimo ou a coluna não existe.
  nextDueAt: string | null;
}

export interface BookSearchResult {
  books: BookSearchItem[];
  total: number;
  page: number;
  pageSize: number;
  categories: string[];
}

export interface BookListFilters {
  query: string;
  category: string;
  status: BookStatusFilter;
  page: number;
}

export interface BookListResult {
  books: BookListItem[];
  total: number;
  page: number;
  pageSize: number;
  categories: string[];
}

export type BookActionResult =
  | { ok: true }
  | { ok: false; reason: "has_history" | "not_found" | "error" };
