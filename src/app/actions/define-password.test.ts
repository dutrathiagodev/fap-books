import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOtp = vi.fn();
const updateUser = vi.fn();
const signOut = vi.fn();
const maybeSingle = vi.fn();
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});
const check = vi.fn();

vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }));
vi.mock("@/lib/request-limits", () => ({ definePasswordLimiter: { check: (key: string) => check(key) } }));
vi.mock("@/lib/supabase/server-client", () => ({
  createSupabaseServerClient: async () => ({
    auth: { verifyOtp, updateUser, signOut },
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) }) }),
  }),
}));

import { definePasswordFromInvite } from "./define-password";

const HASH = "f".repeat(64);
const SECRET = "senha-super-secreta-123";

function form(fields: Record<string, string | undefined>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) data.set(key, value);
  return data;
}
const valid = { token_hash: HASH, type: "invite", password: SECRET, confirmation: SECRET };
const idle = { status: "idle" } as const;

beforeEach(() => {
  vi.clearAllMocks();
  check.mockReturnValue({ allowed: true });
  verifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  maybeSingle.mockResolvedValue({ data: { role: "student" }, error: null });
  updateUser.mockResolvedValue({ error: null });
  signOut.mockResolvedValue({ error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("definePasswordFromInvite", () => {
  it("caminho feliz: confere o token, salva a senha e leva para a primeira tela do perfil", async () => {
    await expect(definePasswordFromInvite(idle, form(valid))).rejects.toThrow("REDIRECT:/aluno/livros");
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: HASH, type: "invite" });
    expect(updateUser).toHaveBeenCalledWith({ password: SECRET });
    expect(verifyOtp.mock.invocationCallOrder[0]).toBeLessThan(updateUser.mock.invocationCallOrder[0]);
  });

  it.each([
    ["librarian", "/funcionario/acervo"],
    ["teacher", "/professor/livros"],
  ])("perfil %s vai para %s", async (role, to) => {
    maybeSingle.mockResolvedValue({ data: { role }, error: null });
    await expect(definePasswordFromInvite(idle, form(valid))).rejects.toThrow(`REDIRECT:${to}`);
  });

  it("redefinir a senha (type=recovery): confere o token com o mesmo tipo, salva a senha e entra", async () => {
    await expect(definePasswordFromInvite(idle, form({ ...valid, type: "recovery" }))).rejects.toThrow("REDIRECT:/aluno/livros");
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: HASH, type: "recovery" });
    expect(updateUser).toHaveBeenCalledWith({ password: SECRET });
  });

  it("link malformado ou de outro tipo: nem fala com o Supabase", async () => {
    expect(await definePasswordFromInvite(idle, form({ ...valid, token_hash: "curto" }))).toEqual({ status: "link_invalid" });
    expect(await definePasswordFromInvite(idle, form({ ...valid, type: "magiclink" }))).toEqual({ status: "link_invalid" });
    expect(await definePasswordFromInvite(idle, form({ ...valid, token_hash: undefined }))).toEqual({ status: "link_invalid" });
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("senha fraca ou senhas diferentes: devolve os problemas e não gasta o token nem o limite", async () => {
    const weak = await definePasswordFromInvite(idle, form({ ...valid, password: "abc", confirmation: "abc" }));
    expect(weak).toMatchObject({ status: "invalid_fields", check: { password: "too_short" } });
    const diff = await definePasswordFromInvite(idle, form({ ...valid, confirmation: "outra-coisa-123" }));
    expect(diff).toMatchObject({ status: "invalid_fields", check: { confirmation: "mismatch" } });
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(check).not.toHaveBeenCalled();
  });

  it("fronteira do mínimo no servidor: 7 caracteres é recusado e 8 é aceito (card 0258)", async () => {
    const short = await definePasswordFromInvite(idle, form({ ...valid, password: "abcdefg", confirmation: "abcdefg" }));
    expect(short).toMatchObject({ status: "invalid_fields", check: { password: "too_short" } });
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();

    await expect(definePasswordFromInvite(idle, form({ ...valid, password: "abcdefgh", confirmation: "abcdefgh" }))).rejects.toThrow();
    expect(updateUser).toHaveBeenCalledWith({ password: "abcdefgh" });
  });

  it("campos de senha ausentes: erro genérico", async () => {
    expect(await definePasswordFromInvite(idle, form({ token_hash: HASH, type: "invite" }))).toEqual({ status: "failed" });
  });

  it("limite de tentativas por IP: responde com o aviso e não consulta o Supabase", async () => {
    check.mockReturnValue({ allowed: false, retryAfterSeconds: 120 });
    const result = await definePasswordFromInvite(idle, form(valid));
    expect(result).toMatchObject({ status: "rate_limited" });
    expect(check).toHaveBeenCalledWith("203.0.113.9");
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("link expirado ou já usado: mensagem de link inválido", async () => {
    verifyOtp.mockResolvedValue({ data: { user: null }, error: { code: "otp_expired", status: 403, name: "AuthApiError" } });
    expect(await definePasswordFromInvite(idle, form(valid))).toEqual({ status: "link_invalid" });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("erro do servidor do Supabase não queima o link: pode tentar de novo", async () => {
    verifyOtp.mockResolvedValue({ data: { user: null }, error: { code: undefined, status: 502, name: "AuthRetryableFetchError" } });
    expect(await definePasswordFromInvite(idle, form(valid))).toEqual({ status: "failed" });
  });

  it("perfil inativo: encerra a sessão e não define a senha", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await definePasswordFromInvite(idle, form(valid))).toEqual({ status: "inactive" });
    expect(signOut).toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("falha ao ler o perfil: encerra a sessão e pede novo convite", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { code: "XX000" } });
    expect(await definePasswordFromInvite(idle, form(valid))).toEqual({ status: "failed_after_use" });
    expect(signOut).toHaveBeenCalled();
  });

  it("falha ao salvar a senha: encerra a sessão e pede novo convite", async () => {
    updateUser.mockResolvedValue({ error: { code: "weak_password", message: "Password is known to be weak" } });
    expect(await definePasswordFromInvite(idle, form(valid))).toEqual({ status: "failed_after_use" });
    expect(signOut).toHaveBeenCalled();
  });

  it("nunca registra token, senha nem mensagem do erro no log", async () => {
    verifyOtp.mockResolvedValue({ data: { user: null }, error: { code: "otp_expired", status: 403, message: `token ${HASH}` } });
    await definePasswordFromInvite(idle, form(valid));
    updateUser.mockResolvedValue({ error: { code: "x", message: `senha ${SECRET}` } });
    verifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    await definePasswordFromInvite(idle, form(valid));
    const logged = JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls);
    expect(logged).not.toContain(HASH);
    expect(logged).not.toContain(SECRET);
    expect(logged).toContain("otp_expired");
  });
});
