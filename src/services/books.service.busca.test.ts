import { beforeEach, describe, expect, it, vi } from "vitest";

// A pesquisa e o acervo usam as funções do banco (search_books e book_situation_counts): aqui se confere o que o app
// envia (parâmetros, nunca texto de consulta) e como ele lê a resposta. A busca em si é testada no banco (supabase/tests).
const rpc = vi.fn();
const getCachedCategories = vi.fn();

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/server-client", () => ({ createSupabaseServerClient: async () => ({ rpc }) }));
vi.mock("./catalog-cache.service", () => ({ getCachedCategories }));
vi.mock("./audit.service", () => ({ recordAudit: vi.fn() }));
vi.mock("./book-cover.service", () => ({ removeBookCover: vi.fn() }));

const { searchBooks, listBooks, countBookSituations } = await import("./books.service");

const row = (over: Record<string, unknown> = {}) => ({
  id: "b1",
  title: "Memórias Póstumas",
  author: "Machado de Assis",
  category: "Romance",
  code: "R-1",
  quantity: 2,
  status: "active",
  cover_url: null,
  open_loans: 1,
  has_active_reservation: false,
  next_due_at: "2026-11-15T12:00:00Z",
  situation: "available",
  total_count: 25,
  page_number: 2,
  isbn: "9788535287615",
  has_history: true,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  getCachedCategories.mockResolvedValue(["Romance", "Saúde"]);
});

describe("searchBooks", () => {
  it("envia texto, categoria, situação, ordem e página como parâmetros da função do banco", async () => {
    rpc.mockResolvedValue({ data: [row()], error: null });
    await searchBooks({ query: "memorias postumas", category: "Romance", page: 2 }, "available", "title");
    expect(rpc).toHaveBeenCalledWith("search_books", {
      p_query: "memorias postumas",
      p_category: "Romance",
      p_situation: "available",
      p_status: "active",
      p_sort: "title",
      p_page: 2,
      p_page_size: 12,
    });
  });

  it("limpa o texto antes de enviar e manda nulo quando não há busca nem categoria", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await searchBooks({ query: "100% (seguro)_;--", category: "", page: 1 }, "all", "relevance");
    expect(rpc).toHaveBeenCalledWith("search_books", expect.objectContaining({ p_query: "100 seguro -", p_category: null }));
    await searchBooks({ query: "   ", category: "", page: 1 }, "all", "relevance");
    expect(rpc).toHaveBeenLastCalledWith("search_books", expect.objectContaining({ p_query: null }));
  });

  it("devolve a página e o total que o banco calculou, com exemplares livres e data de devolução", async () => {
    rpc.mockResolvedValue({ data: [row()], error: null });
    const result = await searchBooks({ query: "", category: "", page: 99 }, "all", "relevance");
    expect(result).toMatchObject({ total: 25, page: 2, pageSize: 12, categories: ["Romance", "Saúde"] });
    expect(result.books[0]).toEqual({
      id: "b1",
      title: "Memórias Póstumas",
      author: "Machado de Assis",
      category: "Romance",
      code: "R-1",
      isbn: "9788535287615",
      coverUrl: null,
      situation: "available",
      freeCopies: 1,
      nextDueAt: "2026-11-15T12:00:00Z",
    });
  });

  it("sem resultado: página 1 e total 0", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(searchBooks({ query: "nada", category: "", page: 3 }, "all", "relevance")).resolves.toMatchObject({
      books: [],
      total: 0,
      page: 1,
    });
  });

  it("categoria desconhecida nem chega ao banco", async () => {
    const result = await searchBooks({ query: "", category: "'; drop table books;--", page: 1 }, "all", "relevance");
    expect(result.books).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("falha com mensagem própria, sem mostrar o erro bruto do banco", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "permission denied for function search_books" } });
    await expect(searchBooks({ query: "", category: "", page: 1 }, "all", "relevance")).rejects.toThrow(
      "Não foi possível pesquisar os livros.",
    );
  });
});

describe("listBooks", () => {
  it("ordena por título, usa o status do filtro e página de 10", async () => {
    rpc.mockResolvedValue({ data: [row({ status: "inactive", situation: "inactive" })], error: null });
    const result = await listBooks({ query: "dom", category: "", status: "all", page: 3 });
    expect(rpc).toHaveBeenCalledWith("search_books", {
      p_query: "dom",
      p_category: null,
      p_situation: "all",
      p_status: "all",
      p_sort: "title",
      p_page: 3,
      p_page_size: 10,
    });
    expect(result).toMatchObject({ total: 25, page: 2, pageSize: 10 });
    expect(result.books[0]).toMatchObject({ openLoans: 1, hasActiveReservation: false, hasHistory: true, status: "inactive" });
  });
});

describe("countBookSituations", () => {
  it("lê os três contadores de uma chamada só, com o mesmo filtro da listagem", async () => {
    rpc.mockResolvedValue({ data: [{ available: 5, reserved: 2, unavailable: "3", inactive: 1, total: 11 }], error: null });
    await expect(countBookSituations({ query: "dom", category: "Romance", status: "active", page: 1 })).resolves.toEqual({
      available: 5,
      reserved: 2,
      unavailable: 3,
    });
    expect(rpc).toHaveBeenCalledWith("book_situation_counts", { p_query: "dom", p_category: "Romance", p_status: "active" });
  });

  it("sem linhas, tudo zero", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(countBookSituations({ query: "", category: "", status: "all", page: 1 })).resolves.toEqual({
      available: 0,
      reserved: 0,
      unavailable: 0,
    });
  });
});
