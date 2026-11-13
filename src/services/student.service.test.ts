import { beforeEach, describe, expect, it, vi } from "vitest";

// O service monta consultas encadeadas (select, eq, is, order, limit). O mock devolve um construtor que registra cada
// chamada e responde com os dados da tabela; assim se confere o filtro por usuário, o limite e a leitura da resposta.
const results = new Map<string, { data: unknown; error: unknown }>();
const calls: { table: string; method: string; args: unknown[] }[] = [];

function builder(table: string) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "order", "limit"]) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ table, method, args });
      return chain;
    };
  }
  chain.maybeSingle = () => Promise.resolve(results.get(table));
  chain.then = (resolve: (value: unknown) => unknown) => resolve(results.get(table));
  return chain;
}
const from = vi.fn((table: string) => builder(table));
const rpc = vi.fn();

vi.mock("@/lib/supabase/server-client", () => ({ createSupabaseServerClient: async () => ({ from, rpc }) }));

const { getStudentSummary, listMyBookReservations, listMyFines, listMyLoans, renewMyLoan } = await import("./student.service");

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const loanRow = (due: string, over = {}) => ({ id: "l1", borrowed_at: future(-3), due_at: due, renewals: 0, books: { title: "Dom Casmurro", code: "R-1" }, ...over });
const used = (table: string, method: string) => calls.filter((c) => c.table === table && c.method === method).map((c) => c.args);

beforeEach(() => {
  results.clear();
  calls.length = 0;
  from.mockClear();
  rpc.mockReset();
  results.set("fines", { data: [], error: null });
  results.set("loans", { data: [], error: null });
  results.set("reservations", { data: [], error: null });
  results.set("profiles", { data: { graduating: false }, error: null });
});

describe("getStudentSummary", () => {
  it("conta livros e multa em aberto, filtra pelo usuário e põe limite em cada leitura", async () => {
    results.set("loans", { data: [loanRow(future(10)), loanRow(future(-2))], error: null });
    results.set("fines", { data: [{ amount_cents: 300 }, { amount_cents: 200 }], error: null });
    const { summary, loans } = await getStudentSummary("u1");
    expect(summary).toMatchObject({ borrowed: 2, limit: 3, remaining: 1, overdue: 1, openFineCents: 500, openFineLabel: "R$ 5,00" });
    // Atrasado primeiro.
    expect(loans[0].status).toBe("overdue");
    expect(used("loans", "eq")).toContainEqual(["user_id", "u1"]);
    expect(used("fines", "eq")).toContainEqual(["user_id", "u1"]);
    expect(used("loans", "limit")).toHaveLength(1);
    expect(used("fines", "limit")).toHaveLength(1);
  });

  it("formando tem limite 4", async () => {
    results.set("profiles", { data: { graduating: true }, error: null });
    expect((await getStudentSummary("u1")).summary.limit).toBe(4);
  });

  it("erro do banco vira mensagem em português, sem texto bruto", async () => {
    results.set("loans", { data: null, error: { message: "relation boom" } });
    await expect(getStudentSummary("u1")).rejects.toThrow("Não foi possível consultar os empréstimos.");
  });
});

describe("listMyLoans", () => {
  it("multa em aberto bloqueia a renovação de todos os livros", async () => {
    results.set("loans", { data: [loanRow(future(10))], error: null });
    results.set("fines", { data: [{ amount_cents: 100 }], error: null });
    const [loan] = await listMyLoans("u1");
    expect(loan.renewBlocked).toMatch(/multa/);
  });

  it("sem atraso nem multa, pode renovar", async () => {
    results.set("loans", { data: [loanRow(future(10))], error: null });
    const [loan] = await listMyLoans("u1");
    expect(loan.renewBlocked).toBeNull();
  });
});

describe("listMyBookReservations", () => {
  it("lê só as reservas do aluno, com limite", async () => {
    results.set("reservations", { data: [{ id: "r1", status: "waiting", created_at: future(-1), books: { title: "A", code: "X" } }], error: null });
    const list = await listMyBookReservations("u1");
    expect(list).toHaveLength(1);
    expect(list[0].statusLabel).toBe("Na fila");
    expect(used("reservations", "eq")).toContainEqual(["user_id", "u1"]);
    expect(used("reservations", "limit")).toHaveLength(1);
  });

  it("estado vazio: lista vazia", async () => {
    expect(await listMyBookReservations("u1")).toEqual([]);
  });
});

describe("listMyFines", () => {
  it("as em aberto vêm antes das pagas", async () => {
    const fine = (id: string, paid_at: string | null) => ({ id, days_late: 2, amount_cents: 200, paid_at, loans: { due_at: future(-5), books: { title: "A", code: "X" } } });
    results.set("fines", { data: [fine("paga", future(-1)), fine("aberta", null)], error: null });
    const list = await listMyFines("u1");
    expect(list.map((f) => f.id)).toEqual(["aberta", "paga"]);
    expect(used("fines", "eq")).toContainEqual(["user_id", "u1"]);
  });

  it("erro do banco não vaza texto bruto", async () => {
    results.set("fines", { data: null, error: { message: "secret" } });
    await expect(listMyFines("u1")).rejects.toThrow("Não foi possível consultar as multas.");
  });
});

describe("renewMyLoan", () => {
  it("chama a função renew_loan do banco com a chave de idempotência e devolve o novo prazo", async () => {
    rpc.mockResolvedValue({ data: { due_at: "2026-11-24T15:00:00Z", renewals: 1 }, error: null });
    expect(await renewMyLoan("l1", "k1")).toEqual({ ok: true, newDueOn: "24/11/2026", renewals: 1 });
    expect(rpc).toHaveBeenCalledWith("renew_loan", { p_loan_id: "l1", p_idempotency_key: "k1" });
  });

  it("multa em aberto: mensagem do aluno, sem o texto do balcão", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "user_has_pending" } });
    const result = await renewMyLoan("l1", "k1");
    expect(result).toMatchObject({ ok: false });
    expect(result.ok === false && result.message).toMatch(/Pague na biblioteca/);
  });

  it("empréstimo de outra pessoa (42501) e erro desconhecido não vazam texto do banco", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "permission denied for table x" } });
    expect(await renewMyLoan("l2", "k1")).toEqual({ ok: false, message: "Você não tem permissão para esta ação." });
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom internal" } });
    expect(await renewMyLoan("l2", "k2")).toEqual({ ok: false, message: "Não foi possível concluir agora. Tente de novo." });
  });
});
