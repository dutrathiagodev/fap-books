import { beforeEach, describe, expect, it, vi } from "vitest";

// Fila de espera (cards 0044 e 0045): confere o que o app envia ao banco, como monta a resposta e que erro de regra vira
// frase em português (nunca o texto bruto). As regras em si (limite, atraso, ordem da fila) são testadas no banco
// (supabase/tests/07-fila-de-espera.sql).
const rpc = vi.fn();
const limit = vi.fn();
const order2 = vi.fn(() => ({ limit }));
const order1 = vi.fn(() => ({ order: order2 }));
const inFn = vi.fn(() => ({ order: order1 }));
const eq = vi.fn(() => ({ in: inFn }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/server-client", () => ({ createSupabaseServerClient: async () => ({ rpc, from }) }));

const { cancelReservation, expireReservation, getBookReservationInfo, listBookQueue, listMyReservations, reserveBook } = await import(
  "./reservations.service"
);

const BOOK = "b0000000-0000-4000-8000-000000000001";
const KEY = "c0000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("listMyReservations", () => {
  it("chama a função do banco e devolve o formato estável da tela", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          id: "r1", book_id: BOOK, title: "Dom Casmurro", author: "Machado", code: "T-001", cover_url: null,
          status: "waiting", created_at: "2026-11-13T10:00:00Z", ready_at: null, expires_at: null, queue_position: 2,
        },
      ],
      error: null,
    });
    const result = await listMyReservations();
    expect(rpc).toHaveBeenCalledWith("list_my_reservations", { p_limit: 50 });
    expect(result).toEqual([
      {
        id: "r1", bookId: BOOK, title: "Dom Casmurro", author: "Machado", code: "T-001", coverUrl: null,
        status: "waiting", createdAt: "2026-11-13T10:00:00Z", readyAt: null, expiresAt: null, queuePosition: 2,
      },
    ]);
  });

  it("o limite pedido fica entre 1 e 100", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await listMyReservations(5000);
    expect(rpc).toHaveBeenLastCalledWith("list_my_reservations", { p_limit: 100 });
    await listMyReservations(0);
    expect(rpc).toHaveBeenLastCalledWith("list_my_reservations", { p_limit: 1 });
  });

  it("erro do banco vira exceção com texto em português", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(listMyReservations()).rejects.toThrow("Não foi possível carregar as suas reservas.");
  });
});

describe("getBookReservationInfo", () => {
  it("id que não é UUID nem chega ao banco", async () => {
    await expect(getBookReservationInfo("1; drop table")).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("traduz a linha da função", async () => {
    rpc.mockResolvedValue({
      data: [{ queue_size: 3, my_reservation_id: "r9", my_status: "ready", my_position: 0, my_expires_at: "2026-11-15T10:00:00Z" }],
      error: null,
    });
    await expect(getBookReservationInfo(BOOK)).resolves.toEqual({
      queueSize: 3, myReservationId: "r9", myStatus: "ready", myPosition: 0, myExpiresAt: "2026-11-15T10:00:00Z",
    });
    expect(rpc).toHaveBeenCalledWith("book_reservation_status", { p_book_id: BOOK });
  });
});

describe("listBookQueue", () => {
  it("consulta só ativas, com limite, e põe a pronta primeiro e numera quem espera", async () => {
    limit.mockResolvedValue({
      data: [
        { id: "a", status: "waiting", created_at: "2026-11-10T10:00:00Z", expires_at: null, profiles: { full_name: "Ana", registration: "11111", phone: null } },
        { id: "b", status: "ready", created_at: "2026-11-09T10:00:00Z", expires_at: "2026-11-15T10:00:00Z", profiles: { full_name: "Bia", registration: null, phone: "44999887766" } },
        { id: "c", status: "waiting", created_at: "2026-11-11T10:00:00Z", expires_at: null, profiles: null },
      ],
      error: null,
    });
    const entries = await listBookQueue(BOOK);
    expect(from).toHaveBeenCalledWith("reservations");
    expect(inFn).toHaveBeenCalledWith("status", ["waiting", "ready"]);
    expect(limit).toHaveBeenCalledWith(100);
    expect(entries.map((e) => [e.id, e.position])).toEqual([["b", 0], ["a", 1], ["c", 2]]);
    expect(entries[2].userName).toBe("Usuário");
  });

  it("id inválido devolve lista vazia sem consultar", async () => {
    await expect(listBookQueue("x")).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});

describe("ações", () => {
  it("reservar envia o livro e a chave de idempotência", async () => {
    rpc.mockResolvedValue({ data: {}, error: null });
    await expect(reserveBook(BOOK, KEY)).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("reserve_book", { p_book_id: BOOK, p_idempotency_key: KEY });
  });

  it("cancelar e expirar usam as funções certas", async () => {
    rpc.mockResolvedValue({ data: {}, error: null });
    await cancelReservation("r1", KEY);
    expect(rpc).toHaveBeenLastCalledWith("cancel_reservation", { p_reservation_id: "r1", p_idempotency_key: KEY });
    await expireReservation("r1", KEY);
    expect(rpc).toHaveBeenLastCalledWith("expire_reservation", { p_reservation_id: "r1", p_idempotency_key: KEY });
  });

  it.each([
    ["loan_limit_reached", "limite de livros"],
    ["user_has_pending", "atraso ou multa"],
    ["already_reserved", "já está na fila"],
    ["book_available", "disponível"],
  ])("erro %s vira frase em português", async (code, trecho) => {
    rpc.mockResolvedValue({ data: null, error: { message: code, code: "P0001", hint: "texto do banco" } });
    const result = await reserveBook(BOOK, KEY);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(trecho);
      expect(result.message).not.toContain(code);
      expect(result.message).not.toContain("texto do banco");
    }
  });

  it("falha inesperada (rede) vira a frase genérica", async () => {
    rpc.mockRejectedValue(new Error("fetch failed"));
    await expect(reserveBook(BOOK, KEY)).resolves.toEqual({ ok: false, message: "Não foi possível concluir agora. Tente de novo." });
  });
});
