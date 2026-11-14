import { beforeEach, describe, expect, it, vi } from "vitest";

// A renovação não tem livros próprios: os da reserva original vêm de uma segunda consulta (achado no QA de 13/11, em que o
// embed da própria tabela deixava a renovação sem livro). Aqui se confere a ligação, com o cliente do banco simulado.
const BOOK = { id: "b1", title: "Fundamentos de Metodologia Científica", code: "T-018" };
const renewalRow = { id: "r2", start_date: "2026-11-15", days: 3, status: "pending", requested_in_person: false, renewal_of: "r1", purpose: null, decision_note: null, decided_at: null, returned_at: null, created_at: "2026-11-13T12:00:00Z", teacher: { full_name: "Professor de Teste" }, decider: null, pedagogical_reservation_books: [] };
const plainRow = { ...renewalRow, id: "r3", renewal_of: null, pedagogical_reservation_books: [{ books: BOOK }] };

const booksQuery = { select: vi.fn(), in: vi.fn(), limit: vi.fn() };
let mainResult: { data: unknown; error: unknown } = { data: [], error: null };
let booksResult: { data: unknown; error: unknown } = { data: [], error: null };

function listBuilder() {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order"]) b[m] = () => b;
  b.limit = async () => mainResult;
  return b;
}

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("./audit.service", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/supabase/server-client", () => ({
  createSupabaseServerClient: async () => ({
    from: (table: string) => {
      if (table === "pedagogical_reservation_books") {
        booksQuery.select.mockReturnValue(booksQuery);
        booksQuery.in.mockReturnValue(booksQuery);
        booksQuery.limit.mockImplementation(async () => booksResult);
        return booksQuery;
      }
      return listBuilder();
    },
  }),
}));

const { listMyReservations } = await import("./pedagogical-reservations.service");

beforeEach(() => {
  vi.clearAllMocks();
  booksResult = { data: [], error: null };
});

describe("listMyReservations: livros da reserva original", () => {
  it("a renovação recebe os livros da original e a reserva comum mantém os próprios", async () => {
    mainResult = { data: [renewalRow, plainRow], error: null };
    booksResult = { data: [{ reservation_id: "r1", books: BOOK }], error: null };
    const views = await listMyReservations("t1");
    expect(booksQuery.in).toHaveBeenCalledWith("reservation_id", ["r1"]);
    expect(views.find((v) => v.id === "r2")?.books).toEqual([BOOK]);
    expect(views.find((v) => v.id === "r3")?.books).toEqual([BOOK]);
  });

  it("sem renovação na página não faz a segunda consulta", async () => {
    mainResult = { data: [plainRow], error: null };
    await listMyReservations("t1");
    expect(booksQuery.in).not.toHaveBeenCalled();
  });

  it("erro na segunda consulta vira erro claro", async () => {
    mainResult = { data: [renewalRow], error: null };
    booksResult = { data: null, error: { message: "x" } };
    await expect(listMyReservations("t1")).rejects.toThrow("Não foi possível consultar os livros da reserva original.");
  });
});
