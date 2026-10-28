// Situação do livro no catálogo (igual ao check de books.status no banco).
export type BookStatus = "active" | "inactive";

export type BookStatusFilter = "all" | BookStatus;

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
  // Já teve empréstimo, reserva ou reserva pedagógica: não pode ser excluído, só inativado.
  hasHistory: boolean;
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
