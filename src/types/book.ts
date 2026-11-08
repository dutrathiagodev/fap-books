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
  isbn: string | null;
  coverUrl: string | null;
  situation: BookSituation;
  // Exemplares na estante agora.
  freeCopies: number;
  // Menor data de devolução prevista entre os empréstimos em aberto (ISO); vazio se não há empréstimo em aberto.
  nextDueAt: string | null;
}

// Página de detalhe do livro (Figma, card 0111). Os dados de catálogo são opcionais: livro antigo pode não tê-los.
export interface BookDetail extends BookSearchItem {
  publisher: string | null;
  publicationYear: number | null;
  description: string | null;
  shelfLocation: string | null;
  cdd: string | null;
  // Total de exemplares do título (a situação e os exemplares livres já vêm de BookSearchItem).
  quantity: number;
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

// Campos do formulário de cadastro (Figma, card 0117). Texto puro: a validação fica no domínio.
export interface BookFormValues {
  title: string;
  authors: string;
  category: string;
  callNumber: string;
  isbn: string;
  quantity: string;
  circulation: string;
  publisher: string;
  edition: string;
}

export type BookFormField = keyof BookFormValues;

// Linha gravada em public.books ao cadastrar um livro.
export interface NewBookRow {
  title: string;
  author: string;
  category: string;
  code: string;
  // Só a classificação (CDD) do código de chamada, sem a notação do autor.
  cdd: string | null;
  isbn: string | null;
  quantity: number;
  status: BookStatus;
  publisher: string | null;
  edition: string | null;
  // Endereço público da capa já enviada ao Storage.
  cover_url?: string | null;
}

// Linha atualizada ao editar: o status (ativo ou inativo) não muda por aqui.
export type BookUpdateRow = Omit<NewBookRow, "status">;

// Livro carregado para edição: os campos do formulário e os exemplares emprestados agora.
export interface BookEditData {
  id: string;
  values: BookFormValues;
  openLoans: number;
}

export type BookUpdateResult =
  | { ok: true }
  | { ok: false; reason: "invalid"; errors: Partial<Record<BookFormField, string>> }
  | { ok: false; reason: "quantity_below_loans"; openLoans: number }
  | { ok: false; reason: "duplicate_code" | "not_found" | "error" };

// Linha da planilha que não entrou, com o motivo (a linha conta o cabeçalho como 1).
export interface BookImportRowError {
  line: number;
  message: string;
}

// Resultado da importação em lote (Figma, card 0117): as linhas boas entram e as ruins voltam com o motivo.
export type BookImportResult =
  | { ok: true; imported: number; errors: BookImportRowError[] }
  | { ok: false; reason: "no_file" | "too_big" | "empty" | "too_many_rows" | "error" }
  // Arquivo recusado antes de abrir: formato que não é .csv/.xlsx, planilha com macro ou arquivo que não é uma planilha.
  | { ok: false; reason: "unsupported_type" | "macro" | "invalid_file" }
  | { ok: false; reason: "missing_columns"; missing: string[] };

export type BookCreateResult =
  | { ok: true; id: string }
  | { ok: false; reason: "invalid"; errors: Partial<Record<BookFormField, string>> }
  | { ok: false; reason: "invalid_cover"; message: string }
  | { ok: false; reason: "duplicate_code" | "error" };
