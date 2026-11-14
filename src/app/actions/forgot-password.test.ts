import { beforeEach, describe, expect, it, vi } from "vitest";

const resetPasswordForEmail = vi.fn();
const ipCheck = vi.fn();
const emailCheck = vi.fn();
const minimum = vi.fn();

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }));
vi.mock("@/lib/request-limits", () => ({
  forgotPasswordIpLimiter: { check: (key: string) => ipCheck(key) },
  forgotPasswordEmailLimiter: { check: (key: string) => emailCheck(key) },
}));
vi.mock("@/lib/site-url", () => ({ getInviteRedirectUrl: () => "https://fap-books.vercel.app/definir-senha" }));
vi.mock("@/lib/supabase/server-client", () => ({
  createSupabaseServerClient: async () => ({ auth: { resetPasswordForEmail } }),
}));
// Sem espera de verdade nos testes: só confere que o piso de tempo foi usado.
vi.mock("../../lib/minimum-duration", () => ({
  withMinimumDuration: (ms: number, operation: () => Promise<unknown>) => {
    minimum(ms);
    return operation();
  },
}));

import { requestPasswordReset } from "./forgot-password";

function form(email: string | undefined) {
  const data = new FormData();
  if (email !== undefined) data.set("email", email);
  return data;
}
const idle = { status: "idle" } as const;

beforeEach(() => {
  vi.clearAllMocks();
  ipCheck.mockReturnValue({ allowed: true });
  emailCheck.mockReturnValue({ allowed: true });
  resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("requestPasswordReset", () => {
  it("caminho feliz: pede o link ao Supabase com o e-mail em minúsculas e responde 'sent'", async () => {
    expect(await requestPasswordReset(idle, form("  Maria.Silva@Email.com "))).toEqual({ status: "sent" });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("maria.silva@email.com", {
      redirectTo: "https://fap-books.vercel.app/definir-senha",
    });
    expect(minimum).toHaveBeenCalledWith(1500);
  });

  it.each([undefined, "", "   ", "sem-arroba", "a@b", "a b@c.com", "x@".padEnd(260, "x") + ".com"])(
    "e-mail inválido (%s): avisa, não gasta limite nem fala com o Supabase",
    async (email) => {
      expect(await requestPasswordReset(idle, form(email))).toEqual({ status: "invalid_email" });
      expect(ipCheck).not.toHaveBeenCalled();
      expect(emailCheck).not.toHaveBeenCalled();
      expect(resetPasswordForEmail).not.toHaveBeenCalled();
    },
  );

  it("limita por IP: devolve o aviso de espera e não fala com o Supabase", async () => {
    ipCheck.mockReturnValue({ allowed: false, retryAfterSeconds: 540 });
    const result = await requestPasswordReset(idle, form("maria@email.com"));
    expect(result).toEqual({ status: "rate_limited", message: expect.stringContaining("9 minutos") });
    expect(ipCheck).toHaveBeenCalledWith("203.0.113.9");
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("limita por e-mail, com a chave normalizada, e não fala com o Supabase", async () => {
    emailCheck.mockReturnValue({ allowed: false, retryAfterSeconds: 3000 });
    const result = await requestPasswordReset(idle, form("MARIA@email.com"));
    expect(result).toMatchObject({ status: "rate_limited" });
    expect(emailCheck).toHaveBeenCalledWith("maria@email.com");
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("resposta neutra: o erro do Supabase para conta inexistente, cota ou pedido repetido vira 'sent', igual ao sucesso", async () => {
    const success = await requestPasswordReset(idle, form("existe@email.com"));
    for (const error of [
      { status: 400, code: "email_address_invalid" },
      { status: 404, code: "user_not_found" },
      { status: 422, code: "validation_failed" },
      { status: 429, code: "over_email_send_rate_limit" },
    ]) {
      resetPasswordForEmail.mockResolvedValueOnce({ data: null, error });
      expect(await requestPasswordReset(idle, form("nao-existe@email.com"))).toEqual(success);
    }
  });

  it.each([{ status: 500, code: "unexpected_failure" }, { status: 0, name: "AuthRetryableFetchError" }])(
    "erro do servidor ou de rede (%o): responde 'failed' para a pessoa tentar de novo",
    async (error) => {
      resetPasswordForEmail.mockResolvedValue({ data: null, error });
      expect(await requestPasswordReset(idle, form("maria@email.com"))).toEqual({ status: "failed" });
    },
  );

  it("não coloca e-mail nem token no log: só o código do erro", async () => {
    resetPasswordForEmail.mockResolvedValue({ data: null, error: { status: 500, code: "unexpected_failure", message: "falha para maria@email.com" } });
    await requestPasswordReset(idle, form("maria@email.com"));
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain("unexpected_failure");
    expect(logged).not.toContain("maria@email.com");
  });
});
