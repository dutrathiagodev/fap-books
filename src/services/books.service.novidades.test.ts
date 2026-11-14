import { beforeEach, describe, expect, it, vi } from "vitest";

// As novidades do acervo vêm de UMA chamada (função new_arrivals, card 0267). Se a função ainda não existe no banco,
// o app cai para o caminho antigo (leitura dos livros e depois a disponibilidade) e devolve o mesmo resultado.
const rpc = vi.fn();
const limit = vi.fn();
const from = vi.fn(() => ({
  select: () => ({ eq: () => ({ not: () => ({ order: () => ({ limit }) }) }) }),
}));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/server-client", () => ({ createSupabaseServerClient: async () => ({ rpc, from }) }));
vi.mock("./catalog-cache.service", () => ({ getCachedCategories: vi.fn() }));
vi.mock("./audit.service", () => ({ recordAudit: vi.fn() }));
vi.mock("./book-cover.service", () => ({ removeBookCover: vi.fn() }));

const { listNewArrivals } = await import("./books.service");

const book = (over: Record<string, unknown> = {}) => ({
  id: "b1",
  title: "A Hora da Estrela",
  author: "Clarice Lispector",
  category: "Romance",
  code: "R-1",
  isbn: null,
  quantity: 2,
  cover_url: "https://x/c.jpg",
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("listNewArrivals", () => {
  it("lê livros e disponibilidade numa chamada só (new_arrivals)", async () => {
    rpc.mockResolvedValue({
      data: [
        { ...book(), open_loans: 0, has_active_reservation: false, next_due_at: null },
        { ...book({ id: "b2", quantity: 1 }), open_loans: 1, has_active_reservation: false, next_due_at: "2026-11-20T12:00:00Z" },
        { ...book({ id: "b3" }), open_loans: 0, has_active_reservation: true, next_due_at: null },
      ],
      error: null,
    });

    const items = await listNewArrivals(5);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("new_arrivals", { p_limit: 5 });
    expect(from).not.toHaveBeenCalled();
    expect(items[0]).toEqual({
      id: "b1",
      title: "A Hora da Estrela",
      author: "Clarice Lispector",
      category: "Romance",
      code: "R-1",
      isbn: null,
      coverUrl: "https://x/c.jpg",
      situation: "available",
      freeCopies: 2,
      nextDueAt: null,
    });
    expect(items[1]).toMatchObject({ situation: "unavailable", freeCopies: 0, nextDueAt: "2026-11-20T12:00:00Z" });
    expect(items[2]).toMatchObject({ situation: "reserved" });
  });

  it("sem a função no banco, usa o caminho antigo com o mesmo resultado", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "new_arrivals") return { data: null, error: { code: "PGRST202" } };
      return { data: [{ book_id: "b1", open_loans: 1, has_active_reservation: false, next_due_at: "2026-11-20T12:00:00Z" }], error: null };
    });
    limit.mockResolvedValue({ data: [book()], error: null });

    const items = await listNewArrivals(5);

    expect(rpc).toHaveBeenCalledWith("book_availability_for_books", { p_book_ids: ["b1"] });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "b1", situation: "available", freeCopies: 1, nextDueAt: "2026-11-20T12:00:00Z" });
  });

  it("erro também no caminho antigo vira a mensagem de sempre", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    limit.mockResolvedValue({ data: null, error: { code: "500" } });
    await expect(listNewArrivals(5)).rejects.toThrow("Não foi possível carregar as novidades.");
  });
});
