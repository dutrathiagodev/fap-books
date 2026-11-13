import { beforeEach, describe, expect, it, vi } from "vitest";

// Renovação da reserva pedagógica (cards 0053 e 0055): confere o que o app envia ao banco e que erro de regra vira frase
// em português. As regras (janela, limite, uma pendente, teto) são testadas no banco (supabase/tests/08-...).
const rpc = vi.fn();

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/server-client", () => ({ createSupabaseServerClient: async () => ({ rpc }) }));
vi.mock("./audit.service", () => ({ recordAudit: vi.fn() }));

const { requestRenewal, getAvailability, RESERVATION_COLUMNS_FOR_TEST } = await import("./pedagogical-reservations.service");

const RES = "b0000000-0000-4000-8000-000000000001";
const KEY = "c0000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("requestRenewal", () => {
  it("chama a função do banco com a reserva, os dias e a chave de idempotência", async () => {
    rpc.mockResolvedValue({ data: {}, error: null });
    await expect(requestRenewal(RES, 7, KEY)).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("request_pedagogical_renewal", { p_reservation_id: RES, p_days: 7, p_idempotency_key: KEY });
  });

  it.each([
    ["renewal_too_early", "última semana"],
    ["renewal_already_pending", "aguardando aprovação"],
    ["renewal_too_long", "365 dias"],
    ["invalid_days", "limite de dias"],
    ["reservation_not_approved", "aprovada"],
  ])("erro %s vira frase em português e é final (a chave é descartada)", async (code, trecho) => {
    rpc.mockResolvedValue({ data: null, error: { message: code, code: "P0001", hint: "texto do banco" } });
    const result = await requestRenewal(RES, 7, KEY);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(trecho);
      expect(result.message).not.toContain("texto do banco");
      expect(result.final).toBe(true);
    }
  });

  it("falha desconhecida (rede) não é final: a nova tentativa vale a mesma chave", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "fetch failed" } });
    const result = await requestRenewal(RES, 7, KEY);
    expect(result).toMatchObject({ ok: false, final: false });
  });
});

describe("getAvailability de uma renovação", () => {
  it("não consulta nada: os exemplares já estão guardados na reserva original", async () => {
    const view = { id: "r2", renewal: true, books: [{ id: "b1", title: "Livro", code: "L-1" }] };
    await expect(getAvailability(view as never)).resolves.toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });
});

// A tabela aponta para ela mesma (renewal_of). Com o nome da constraint na dica, o PostgREST responde PGRST200 e as telas da
// reserva pedagógica quebram (achado no QA de 13/11); a dica certa é o nome da coluna. Os testes com `from` simulado não pegam isso.
describe("select da reserva pedagógica", () => {
  it("liga a reserva original pela coluna renewal_of, não pelo nome da constraint", () => {
    expect(RESERVATION_COLUMNS_FOR_TEST).toContain("original:pedagogical_reservations!renewal_of(");
    expect(RESERVATION_COLUMNS_FOR_TEST).not.toContain("pedagogical_reservations_renewal_of_fkey");
  });
});
