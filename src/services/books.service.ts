import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { cleanSearchTerm, countSituations, type SituationCounts } from "@/domain/books/book-rules";
import type { BookActionResult, BookListFilters, BookListItem, BookListResult, BookStatus } from "@/types/book";
import { recordAudit } from "./audit.service";

export const BOOKS_PAGE_SIZE = 10;

// Código do Postgres para "ainda é usado por outra tabela" (empréstimo, reserva ou reserva pedagógica).
const FOREIGN_KEY_VIOLATION = "23503";
// Reserva que ainda guarda um exemplar: aguardando ou pronta para retirada (as outras já foram atendidas ou canceladas).
const ACTIVE_RESERVATION_STATUSES = ["waiting", "ready"];
// Código do PostgREST para página além do fim da lista.
const RANGE_NOT_SATISFIABLE = "PGRST103";

// Filtro de busca por título, autor ou código. A listagem e os contadores usam o mesmo, para os números baterem.
function searchClause(term: string): string {
  return `title.ilike.%${term}%,author.ilike.%${term}%,code.ilike.%${term}%`;
}

// Contadores do topo: quantos títulos do resultado do filtro (não só da página) estão disponíveis, emprestados ou reservados.
// Lê até 1000 linhas por consulta (limite padrão do PostgREST); acima disso, trocar por uma função no banco.
export async function countBookSituations(filters: BookListFilters): Promise<SituationCounts> {
  await connection();
  const supabase = await createSupabaseServerClient();

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
  const [loans, reservations, pedagogical, categories] = await Promise.all([
    ids.length ? supabase.from("loans").select("book_id, returned_at").in("book_id", ids) : { data: [], error: null },
    ids.length
      ? supabase.from("reservations").select("book_id, status").in("book_id", ids)
      : { data: [], error: null },
    ids.length
      ? supabase.from("pedagogical_reservation_books").select("book_id").in("book_id", ids)
      : { data: [], error: null },
    supabase.from("books").select("category").not("category", "is", null),
  ]);
  if (loans.error || reservations.error || pedagogical.error || categories.error) {
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

  const uniqueCategories = [...new Set((categories.data ?? []).map((row) => row.category as string))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  return { books, total: count ?? 0, page: filters.page, pageSize: BOOKS_PAGE_SIZE, categories: uniqueCategories };
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
