import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { availableCopies, cleanSearchTerm, isUuid, type BookSort, type SituationCounts } from "@/domain/books/book-rules";
import type {
  BookActionResult,
  BookAvailabilityFilter,
  BookCreateResult,
  BookDetail,
  BookEditData,
  BookListFilters,
  BookListItem,
  BookListResult,
  BookSearchItem,
  BookSearchResult,
  BookSituation,
  BookStatus,
  BookUpdateResult,
  BookUpdateRow,
  NewBookRow,
} from "@/types/book";
import { quantityBelowOpenLoans, toBookFormValues } from "@/domain/books/book-form-rules";
import { coverPathFromUrl } from "@/domain/books/cover-rules";
import { recordAudit } from "./audit.service";
import { getCachedCategories } from "./catalog-cache.service";
import { removeBookCover } from "./book-cover.service";
import { shelfByBook, shelfStatus, type ShelfRow } from "./book-shelf";
import { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION } from "./postgres-codes";

const BOOKS_PAGE_SIZE = 10;
// A pesquisa de alunos e professores mostra 12 livros por página: fecha as linhas da grade de 3 (professor) e de 4 colunas (aluno).
const SEARCH_PAGE_SIZE = 12;

// Cada linha da search_books do banco (migrations 20261108100100 e 20261109090000). O filtro por texto sem acento,
// a situação, a ordem, a contagem e a página são calculados no banco; o app só mostra.
interface SearchBooksRow {
  id: string;
  title: string;
  author: string;
  category: string | null;
  code: string;
  quantity: number;
  status: string;
  cover_url: string | null;
  open_loans: number;
  has_active_reservation: boolean;
  next_due_at: string | null;
  situation: BookSituation;
  total_count: number;
  page_number: number;
  isbn: string | null;
  has_history: boolean;
}

// Chama a search_books. O texto, a categoria e os filtros vão como parâmetros (nunca montados em texto de consulta).
// Se a página pedida passa do fim, o banco devolve a última; sem nenhuma linha, a página é 1 e o total 0.
async function runSearch(
  supabase: ServerClient,
  args: {
    query: string;
    category: string;
    situation: BookAvailabilityFilter;
    status: "active" | "inactive" | "all";
    sort: BookSort;
    page: number;
    pageSize: number;
  },
): Promise<{ rows: SearchBooksRow[]; total: number; page: number }> {
  const { data, error } = await supabase.rpc("search_books", {
    p_query: args.query || null,
    p_category: args.category || null,
    p_situation: args.situation,
    p_status: args.status,
    p_sort: args.sort,
    p_page: args.page,
    p_page_size: args.pageSize,
  });
  if (error || !data) throw new Error("Não foi possível pesquisar os livros.");
  const rows = data as SearchBooksRow[];
  return { rows, total: Number(rows[0]?.total_count ?? 0), page: rows[0]?.page_number ?? 1 };
}

// Categorias sem repetir, em ordem alfabética (viram as opções do filtro).
function sortedCategories(rows: { category: string | null }[]): string[] {
  return [...new Set(rows.map((row) => row.category as string))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// Categorias do acervo. A categoria que vem do endereço só pode ir para a consulta se estiver nesta lista: texto
// desconhecido (inclusive de ataque) nunca chega ao banco.
// Vem do cache compartilhado (igual para todo mundo, renovado quando o acervo muda). Se o cache falhar (por exemplo,
// a função do banco ainda não foi aplicada), cai para a leitura direta com a sessão da pessoa.
async function loadCategories(supabase: ServerClient, activeOnly = false): Promise<string[]> {
  try {
    return await getCachedCategories(activeOnly);
  } catch {
    let query = supabase.from("books").select("category").not("category", "is", null).limit(1000);
    if (activeOnly) query = query.eq("status", "active");
    const { data, error } = await query;
    if (error) throw new Error("Não foi possível carregar as categorias.");
    return sortedCategories(data);
  }
}

type SearchBookRow = {
  id: string;
  title: string;
  author: string;
  category: string | null;
  code: string;
  isbn: string | null;
  quantity: number;
  cover_url: string | null;
};

// Livro da pesquisa a partir do catálogo (novidades e detalhe): a situação na estante vem da disponibilidade.
function toSearchItem(book: SearchBookRow, shelfRows: ReturnType<typeof shelfByBook>): BookSearchItem {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    category: book.category,
    code: book.code,
    isbn: book.isbn,
    coverUrl: book.cover_url,
    ...shelfStatus(book.quantity, shelfRows.get(book.id)),
  };
}

// Disponibilidade só dos livros pedidos (a função limita a 100 ids). Nunca lê o acervo todo.
async function loadShelf(supabase: ServerClient, bookIds: string[]) {
  return supabase.rpc("book_availability_for_books", { p_book_ids: bookIds });
}

// Livros ativos mais recentes (Figma, card 0108: destaque e "Novidades no acervo" da pesquisa do aluno).
// Só entram livros com capa, que é o que o desenho mostra; sem capa o espaço ficaria vazio.
export async function listNewArrivals(limit: number): Promise<BookSearchItem[]> {
  await connection();
  const supabase = await createSupabaseServerClient();

  const books = await supabase
    .from("books")
    .select("id, title, author, category, code, isbn, quantity, cover_url")
    .eq("status", "active")
    .not("cover_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (books.error) throw new Error("Não foi possível carregar as novidades.");

  const shelf = await loadShelf(supabase, books.data.map((book) => book.id));
  if (shelf.error) throw new Error("Não foi possível carregar as novidades.");

  const shelfRows = shelfByBook(shelf.data as ShelfRow[]);
  return books.data.map((book) => toSearchItem(book, shelfRows));
}

// Pesquisa de alunos e professores (Figma, card 0108): só livros ativos. Busca sem acento e sem diferenciar maiúsculas,
// situação, ordem, contagem e página são feitos no banco (função search_books, com índice): a página traz só 12 livros.
// A situação vem do banco, que enxerga todos os empréstimos mesmo com o RLS escondendo os dos outros.
export async function searchBooks(
  filters: Pick<BookListFilters, "query" | "category" | "page">,
  availability: BookAvailabilityFilter,
  sort: BookSort,
): Promise<BookSearchResult> {
  await connection();
  const supabase = await createSupabaseServerClient();

  const categories = await loadCategories(supabase, true);
  // Categoria que não existe no acervo (inclusive texto de ataque no endereço) nem chega à consulta.
  if (filters.category && !categories.includes(filters.category)) {
    return { books: [], total: 0, page: 1, pageSize: SEARCH_PAGE_SIZE, categories };
  }

  const { rows, total, page } = await runSearch(supabase, {
    query: cleanSearchTerm(filters.query),
    category: filters.category,
    situation: availability,
    status: "active",
    sort,
    page: filters.page,
    pageSize: SEARCH_PAGE_SIZE,
  });

  const books: BookSearchItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    code: row.code,
    isbn: row.isbn,
    coverUrl: row.cover_url,
    situation: row.situation,
    freeCopies: availableCopies(row.quantity, row.open_loans),
    nextDueAt: row.next_due_at,
  }));
  return { books, total, page, pageSize: SEARCH_PAGE_SIZE, categories };
}

// Detalhe de um livro. O id vem do endereço: só consulta o banco se for um UUID. Devolve null se não existe ou
// está inativo (exceto para a bibliotecária, includeInactive) (o RLS libera a leitura a quem está logado; a situação vem da função book_availability).
export async function getBookDetail(id: string, includeInactive = false): Promise<BookDetail | null> {
  if (!isUuid(id)) return null;
  await connection();
  const supabase = await createSupabaseServerClient();

  // A bibliotecária também abre o livro inativo (ele continua na listagem do acervo); aluno e professor só veem o ativo.
  let bookQuery = supabase
    .from("books")
    .select(
      "id, title, author, category, code, quantity, cover_url, isbn, publisher, publication_year, description, shelf_location, cdd, status",
    )
    .eq("id", id);
  if (!includeInactive) bookQuery = bookQuery.eq("status", "active");

  const [book, shelf] = await Promise.all([bookQuery.maybeSingle(), loadShelf(supabase, [id])]);
  if (book.error || shelf.error) throw new Error("Não foi possível carregar o livro.");
  if (!book.data) return null;

  const row = book.data;
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    code: row.code,
    isbn: row.isbn,
    coverUrl: row.cover_url,
    ...shelfStatus(row.quantity, shelfByBook(shelf.data as ShelfRow[]).get(row.id)),
    ...(row.status === "inactive" ? { situation: "inactive" as const } : {}),
    publisher: row.publisher,
    publicationYear: row.publication_year,
    description: row.description,
    shelfLocation: row.shelf_location,
    cdd: row.cdd,
    quantity: row.quantity,
  };
}

// Contadores do topo: quantos títulos do resultado do filtro (não só da página) estão disponíveis, emprestados ou reservados.
// Uma consulta no banco (função book_situation_counts), com o mesmo filtro da listagem para os números baterem.
export async function countBookSituations(filters: BookListFilters): Promise<SituationCounts> {
  await connection();
  const supabase = await createSupabaseServerClient();
  if (filters.category && !(await loadCategories(supabase)).includes(filters.category)) {
    return { available: 0, unavailable: 0, reserved: 0 };
  }

  const { data, error } = await supabase.rpc("book_situation_counts", {
    p_query: cleanSearchTerm(filters.query) || null,
    p_category: filters.category || null,
    p_status: filters.status,
  });
  if (error || !data) throw new Error("Não foi possível contar o acervo.");

  const counts = (Array.isArray(data) ? data[0] : data) as { available: number; unavailable: number; reserved: number } | undefined;
  return {
    available: Number(counts?.available ?? 0),
    unavailable: Number(counts?.unavailable ?? 0),
    reserved: Number(counts?.reserved ?? 0),
  };
}

// Lista o acervo com busca, filtros e página, por título. Só a bibliotecária usa esta tela (livro inativo só ela vê).
// A busca, a contagem e a página vêm da função search_books do banco, que devolve a última página se a pedida passar do fim.
export async function listBooks(filters: BookListFilters): Promise<BookListResult> {
  await connection();
  const supabase = await createSupabaseServerClient();
  const categories = await loadCategories(supabase);
  if (filters.category && !categories.includes(filters.category)) {
    return { books: [], total: 0, page: 1, pageSize: BOOKS_PAGE_SIZE, categories };
  }

  const { rows, total, page } = await runSearch(supabase, {
    query: cleanSearchTerm(filters.query),
    category: filters.category,
    situation: "all",
    status: filters.status,
    sort: "title",
    page: filters.page,
    pageSize: BOOKS_PAGE_SIZE,
  });

  // Edição e editora só dos livros desta página (até BOOKS_PAGE_SIZE), numa consulta só.
  const { data: extras } = rows.length
    ? await supabase.from("books").select("id, edition, publisher").in("id", rows.map((row) => row.id)).limit(rows.length)
    : { data: [] };
  const extraById = new Map((extras ?? []).map((extra) => [extra.id as string, extra]));

  const books: BookListItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    code: row.code,
    quantity: row.quantity,
    status: row.status as BookStatus,
    coverUrl: row.cover_url,
    edition: (extraById.get(row.id)?.edition as string | null | undefined) ?? null,
    publisher: (extraById.get(row.id)?.publisher as string | null | undefined) ?? null,
    openLoans: row.open_loans,
    hasActiveReservation: row.has_active_reservation,
    hasHistory: row.has_history,
  }));

  return { books, total, page, pageSize: BOOKS_PAGE_SIZE, categories };
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
  const { data, error } = await supabase.from("books").delete().eq("id", bookId).select("id, cover_url");

  if (error) return { ok: false, reason: error.code === FOREIGN_KEY_VIOLATION ? "has_history" : "error" };
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };

  await recordAudit({ actorId, action: "book_deleted", entity: "books", entityId: bookId });
  // O livro já saiu do acervo: a capa dele não pode ficar solta no Storage. Se a remoção falhar, só vai para o log.
  const coverPath = coverPathFromUrl(data[0].cover_url);
  if (coverPath) await removeBookCover(coverPath);
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
