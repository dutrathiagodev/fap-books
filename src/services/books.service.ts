import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  availableCopies,
  isUuid,
  bookSituation,
  cleanSearchTerm,
  countSituations,
  paginateBySituation,
  sortBooks,
  type BookSort,
  type SituationCounts,
} from "@/domain/books/book-rules";
import type {
  BookActionResult,
  BookAvailabilityFilter,
  BookCreateResult,
  BookDetail,
  BookEditData,
  BookListFilters,
  BookListItem,
  BookListResult,
  BookSearchResult,
  BookStatus,
  BookUpdateResult,
  BookUpdateRow,
  NewBookRow,
} from "@/types/book";
import { quantityBelowOpenLoans, toBookFormValues } from "@/domain/books/book-form-rules";
import { recordAudit } from "./audit.service";

export const BOOKS_PAGE_SIZE = 10;
// A pesquisa de alunos e professores mostra 3 colunas por 2 linhas (Figma, card 0108).
export const SEARCH_PAGE_SIZE = 6;

// Código do Postgres para "ainda é usado por outra tabela" (empréstimo, reserva ou reserva pedagógica).
const FOREIGN_KEY_VIOLATION = "23503";
// Reserva que ainda guarda um exemplar: aguardando ou pronta para retirada (as outras já foram atendidas ou canceladas).
const ACTIVE_RESERVATION_STATUSES = ["waiting", "ready"];
// Código do Postgres para "já existe": o código do livro é único.
const UNIQUE_VIOLATION = "23505";
// Código do PostgREST para página além do fim da lista.
const RANGE_NOT_SATISFIABLE = "PGRST103";

// Filtro de busca por título, autor, código ou ISBN. A listagem e os contadores usam o mesmo, para os números baterem.
function searchClause(term: string): string {
  return `title.ilike.%${term}%,author.ilike.%${term}%,code.ilike.%${term}%,isbn.ilike.%${term}%`;
}

// Categorias sem repetir, em ordem alfabética (viram as opções do filtro).
function sortedCategories(rows: { category: string | null }[]): string[] {
  return [...new Set(rows.map((row) => row.category as string))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// Categorias do acervo. A categoria que vem do endereço só pode ir para a consulta se estiver nesta lista: texto
// desconhecido (inclusive de ataque) nunca chega ao banco.
async function loadCategories(supabase: ServerClient): Promise<string[]> {
  const { data, error } = await supabase.from("books").select("category").not("category", "is", null);
  if (error) throw new Error("Não foi possível carregar as categorias.");
  return sortedCategories(data);
}

// Uma linha de book_availability: só contagens por livro, nunca quem pegou ou reservou.
interface ShelfRow {
  book_id: string;
  open_loans: number;
  has_active_reservation: boolean;
  // Ausente enquanto a migration da data de devolução não foi aplicada.
  next_due_at?: string | null;
}

// Pesquisa de alunos e professores (Figma, card 0108): só livros ativos. O RLS esconde os empréstimos dos outros,
// então a situação vem da função book_availability do banco. Lê até 1000 livros (limite padrão do PostgREST);
// acima disso, trocar por paginação no banco.
export async function searchBooks(
  filters: Pick<BookListFilters, "query" | "category" | "page">,
  availability: BookAvailabilityFilter,
  sort: BookSort,
): Promise<BookSearchResult> {
  await connection();
  const supabase = await createSupabaseServerClient();

  let booksQuery = supabase
    .from("books")
    .select("id, title, author, category, code, isbn, quantity, cover_url")
    .eq("status", "active");
  const term = cleanSearchTerm(filters.query);
  if (term) booksQuery = booksQuery.or(searchClause(term));

  const [books, shelf, categories] = await Promise.all([
    booksQuery,
    supabase.rpc("book_availability"),
    supabase.from("books").select("category").eq("status", "active").not("category", "is", null),
  ]);
  if (books.error || shelf.error || categories.error) throw new Error("Não foi possível pesquisar os livros.");

  const shelfByBook = new Map((shelf.data as ShelfRow[]).map((row) => [row.book_id, row]));
  // A categoria é filtrada aqui, na memória: o texto vindo do endereço não vai para a consulta ao banco.
  const inCategory = books.data.filter((book) => !filters.category || book.category === filters.category);
  const found = inCategory.map((book) => {
    const state = shelfByBook.get(book.id);
    const openLoans = state?.open_loans ?? 0;
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      category: book.category,
      code: book.code,
      isbn: book.isbn,
      coverUrl: book.cover_url,
      situation: bookSituation({
        quantity: book.quantity,
        status: "active",
        openLoans,
        hasActiveReservation: state?.has_active_reservation ?? false,
      }),
      freeCopies: availableCopies(book.quantity, openLoans),
      nextDueAt: state?.next_due_at ?? null,
    };
  });

  const result = paginateBySituation(sortBooks(found, sort, term), availability, filters.page, SEARCH_PAGE_SIZE);
  return {
    books: result.items,
    total: result.total,
    page: result.page,
    pageSize: SEARCH_PAGE_SIZE,
    categories: sortedCategories(categories.data),
  };
}

// Detalhe de um livro ativo. O id vem do endereço: só consulta o banco se for um UUID. Devolve null se não existe ou
// está inativo (o RLS libera a leitura a quem está logado; a situação vem da função book_availability).
export async function getBookDetail(id: string): Promise<BookDetail | null> {
  if (!isUuid(id)) return null;
  await connection();
  const supabase = await createSupabaseServerClient();

  const [book, shelf] = await Promise.all([
    supabase
      .from("books")
      .select(
        "id, title, author, category, code, quantity, cover_url, isbn, publisher, publication_year, description, shelf_location, cdd",
      )
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle(),
    supabase.rpc("book_availability"),
  ]);
  if (book.error || shelf.error) throw new Error("Não foi possível carregar o livro.");
  if (!book.data) return null;

  const row = book.data;
  const state = (shelf.data as ShelfRow[]).find((item) => item.book_id === row.id);
  const openLoans = state?.open_loans ?? 0;
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    code: row.code,
    isbn: row.isbn,
    coverUrl: row.cover_url,
    situation: bookSituation({
      quantity: row.quantity,
      status: "active",
      openLoans,
      hasActiveReservation: state?.has_active_reservation ?? false,
    }),
    freeCopies: availableCopies(row.quantity, openLoans),
    nextDueAt: state?.next_due_at ?? null,
    publisher: row.publisher,
    publicationYear: row.publication_year,
    description: row.description,
    shelfLocation: row.shelf_location,
    cdd: row.cdd,
    quantity: row.quantity,
  };
}

// Contadores do topo: quantos títulos do resultado do filtro (não só da página) estão disponíveis, emprestados ou reservados.
// Lê até 1000 linhas por consulta (limite padrão do PostgREST); acima disso, trocar por uma função no banco.
export async function countBookSituations(filters: BookListFilters): Promise<SituationCounts> {
  await connection();
  const supabase = await createSupabaseServerClient();
  if (filters.category && !(await loadCategories(supabase)).includes(filters.category)) {
    return { available: 0, unavailable: 0, reserved: 0 };
  }

  let booksQuery = supabase.from("books").select("id, quantity, status");
  const term = cleanSearchTerm(filters.query);
  if (term) booksQuery = booksQuery.or(searchClause(term));
  if (filters.category) booksQuery = booksQuery.eq("category", filters.category);
  if (filters.status !== "all") booksQuery = booksQuery.eq("status", filters.status);

  const [books, loans, reservations] = await Promise.all([
    booksQuery,
    supabase.from("loans").select("book_id").is("returned_at", null),
    supabase.from("reservations").select("book_id").in("status", ACTIVE_RESERVATION_STATUSES),
  ]);
  if (books.error || loans.error || reservations.error) throw new Error("Não foi possível contar o acervo.");

  const openLoans = new Map<string, number>();
  for (const loan of loans.data) openLoans.set(loan.book_id, (openLoans.get(loan.book_id) ?? 0) + 1);
  const reserved = new Set(reservations.data.map((reservation) => reservation.book_id));

  return countSituations(
    books.data.map((book) => ({
      quantity: book.quantity,
      status: book.status as BookStatus,
      openLoans: openLoans.get(book.id) ?? 0,
      hasActiveReservation: reserved.has(book.id),
    })),
  );
}

// Lista o acervo com busca, filtros e página. Só a bibliotecária usa esta tela (o RLS libera a leitura a todos).
export async function listBooks(filters: BookListFilters): Promise<BookListResult> {
  await connection();
  const supabase = await createSupabaseServerClient();
  const categories = await loadCategories(supabase);
  if (filters.category && !categories.includes(filters.category)) {
    return { books: [], total: 0, page: 1, pageSize: BOOKS_PAGE_SIZE, categories };
  }

  const from = (filters.page - 1) * BOOKS_PAGE_SIZE;
  let query = supabase
    .from("books")
    .select("id, title, author, category, code, quantity, status, cover_url", { count: "exact" })
    .order("title")
    .range(from, from + BOOKS_PAGE_SIZE - 1);

  const term = cleanSearchTerm(filters.query);
  if (term) query = query.or(searchClause(term));
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.status !== "all") query = query.eq("status", filters.status);

  const { data, count, error } = await query;

  if (error?.code === RANGE_NOT_SATISFIABLE && filters.page > 1) {
    return listBooks({ ...filters, page: 1 });
  }
  if (error || !data) throw new Error("Não foi possível carregar o acervo.");

  const ids = data.map((row) => row.id);
  const [loans, reservations, pedagogical] = await Promise.all([
    ids.length ? supabase.from("loans").select("book_id, returned_at").in("book_id", ids) : { data: [], error: null },
    ids.length
      ? supabase.from("reservations").select("book_id, status").in("book_id", ids)
      : { data: [], error: null },
    ids.length
      ? supabase.from("pedagogical_reservation_books").select("book_id").in("book_id", ids)
      : { data: [], error: null },
  ]);
  if (loans.error || reservations.error || pedagogical.error) {
    throw new Error("Não foi possível carregar o acervo.");
  }

  const openLoans = new Map<string, number>();
  const withHistory = new Set<string>();
  for (const loan of loans.data ?? []) {
    withHistory.add(loan.book_id);
    if (loan.returned_at === null) openLoans.set(loan.book_id, (openLoans.get(loan.book_id) ?? 0) + 1);
  }
  for (const row of [...(reservations.data ?? []), ...(pedagogical.data ?? [])]) withHistory.add(row.book_id);
  const withActiveReservation = new Set(
    (reservations.data ?? []).filter((row) => ACTIVE_RESERVATION_STATUSES.includes(row.status)).map((row) => row.book_id),
  );

  const books: BookListItem[] = data.map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    code: row.code,
    quantity: row.quantity,
    status: row.status as BookStatus,
    coverUrl: row.cover_url,
    openLoans: openLoans.get(row.id) ?? 0,
    hasActiveReservation: withActiveReservation.has(row.id),
    hasHistory: withHistory.has(row.id),
  }));

  return { books, total: count ?? 0, page: filters.page, pageSize: BOOKS_PAGE_SIZE, categories };
}

// Grava o livro novo. A linha já foi validada no servidor; o banco confere de novo (check, unique e RLS).
// O erro do banco nunca sai daqui: vira um motivo conhecido.
export async function createBook(row: NewBookRow, actorId: string): Promise<BookCreateResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("books").insert(row).select("id").single();

  if (error) return { ok: false, reason: error.code === UNIQUE_VIOLATION ? "duplicate_code" : "error" };

  await recordAudit({ actorId, action: "book_created", entity: "books", entityId: data.id });
  return { ok: true, id: data.id };
}

// Exemplares emprestados agora (empréstimos sem devolução). null se a consulta falhar.
async function countOpenLoans(supabase: ServerClient, bookId: string): Promise<number | null> {
  const { count, error } = await supabase
    .from("loans")
    .select("id", { count: "exact", head: true })
    .eq("book_id", bookId)
    .is("returned_at", null);
  return error ? null : (count ?? 0);
}

// Livro para o formulário de edição (ativo ou inativo). O id vem do endereço: só consulta se for UUID.
// Devolve null se não existe.
export async function getBookForEdit(id: string): Promise<BookEditData | null> {
  if (!isUuid(id)) return null;
  await connection();
  const supabase = await createSupabaseServerClient();

  const [book, openLoans] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, category, code, isbn, quantity, publisher, edition")
      .eq("id", id)
      .maybeSingle(),
    countOpenLoans(supabase, id),
  ]);
  if (book.error || openLoans === null) throw new Error("Não foi possível carregar o livro.");
  if (!book.data) return null;

  return { id: book.data.id, values: toBookFormValues(book.data), openLoans };
}

// Atualiza o livro. A linha já foi validada no servidor; o banco confere de novo (check, unique e RLS).
// Recusa quantidade menor que os empréstimos em aberto. O erro do banco nunca sai daqui.
export async function updateBook(id: string, row: BookUpdateRow, actorId: string): Promise<BookUpdateResult> {
  if (!isUuid(id)) return { ok: false, reason: "not_found" };
  const supabase = await createSupabaseServerClient();

  const openLoans = await countOpenLoans(supabase, id);
  if (openLoans === null) return { ok: false, reason: "error" };
  if (quantityBelowOpenLoans(row.quantity, openLoans)) return { ok: false, reason: "quantity_below_loans", openLoans };

  const { data, error } = await supabase.from("books").update(row).eq("id", id).select("id");
  if (error) return { ok: false, reason: error.code === UNIQUE_VIOLATION ? "duplicate_code" : "error" };
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };

  await recordAudit({ actorId, action: "book_updated", entity: "books", entityId: id });
  return { ok: true };
}

// Exclui o livro. O banco recusa se ele tem histórico (FK), e o RLS recusa quem não é bibliotecária.
export async function deleteBook(bookId: string, actorId: string): Promise<BookActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("books").delete().eq("id", bookId).select("id");

  if (error) return { ok: false, reason: error.code === FOREIGN_KEY_VIOLATION ? "has_history" : "error" };
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };

  await recordAudit({ actorId, action: "book_deleted", entity: "books", entityId: bookId });
  return { ok: true };
}

// Tira o livro do acervo ativo e mantém o histórico (é o que se faz com livro que já foi emprestado).
export async function inactivateBook(bookId: string, actorId: string): Promise<BookActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("books").update({ status: "inactive" }).eq("id", bookId).select("id");

  if (error) return { ok: false, reason: "error" };
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };

  await recordAudit({ actorId, action: "book_inactivated", entity: "books", entityId: bookId });
  return { ok: true };
}
