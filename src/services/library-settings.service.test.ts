import { beforeEach, describe, expect, it, vi } from "vitest";

// Configurações da biblioteca (card 0218): o app lê o limite de dias e pede ao banco para alterá-lo. Aqui se confere o
// que ele envia e como trata a resposta; a regra em si (só a funcionária, de 1 a 365) é testada no banco.
const maybeSingle = vi.fn();
const rpc = vi.fn();
const from = vi.fn(() => ({ select: () => ({ eq: () => ({ limit: () => ({ maybeSingle }) }) }) }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/server-client", () => ({ createSupabaseServerClient: async () => ({ from, rpc }) }));

const { getPedagogicalMaxDays, setPedagogicalMaxDays } = await import("./library-settings.service");

beforeEach(() => vi.clearAllMocks());

describe("getPedagogicalMaxDays", () => {
  it("lê o limite da tabela de configurações", async () => {
    maybeSingle.mockResolvedValue({ data: { int_value: 45 }, error: null });
    await expect(getPedagogicalMaxDays()).resolves.toBe(45);
    expect(from).toHaveBeenCalledWith("library_settings");
  });

  it.each([
    ["erro de leitura", { data: null, error: { message: "boom" } }],
    ["linha ausente", { data: null, error: null }],
    ["valor zero", { data: { int_value: 0 }, error: null }],
    ["valor acima do teto", { data: { int_value: 999 }, error: null }],
    ["valor que não é inteiro", { data: { int_value: 2.5 }, error: null }],
  ])("volta ao padrão de 30 dias em %s", async (_nome, resposta) => {
    maybeSingle.mockResolvedValue(resposta);
    await expect(getPedagogicalMaxDays()).resolves.toBe(30);
  });
});

describe("setPedagogicalMaxDays", () => {
  it("chama a função do banco com o valor e devolve o limite salvo", async () => {
    rpc.mockResolvedValue({ data: 45, error: null });
    await expect(setPedagogicalMaxDays(45)).resolves.toEqual({ ok: true, days: 45 });
    expect(rpc).toHaveBeenCalledWith("set_pedagogical_max_days", { p_days: 45 });
  });

  it.each([
    ["sem permissão (SQLSTATE 42501)", { code: "42501", message: "permission denied" }, "Só a funcionária da biblioteca altera o limite."],
    ["perfil sem direito (not_allowed)", { code: "P0001", message: "not_allowed" }, "Só a funcionária da biblioteca altera o limite."],
    ["valor fora do intervalo", { code: "P0001", message: "invalid_max_days" }, "Informe de 1 a 365 dias."],
    ["erro qualquer", { code: "XX000", message: "boom" }, "Não foi possível salvar agora. Tente de novo."],
  ])("traduz o erro: %s", async (_nome, error, message) => {
    rpc.mockResolvedValue({ data: null, error });
    await expect(setPedagogicalMaxDays(45)).resolves.toEqual({ ok: false, message });
  });
});
