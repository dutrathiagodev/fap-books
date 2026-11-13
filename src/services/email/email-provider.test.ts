import { describe, expect, it, vi } from "vitest";
import { DryRunEmailProvider, ResendEmailProvider, getEmailProvider } from "./email-provider";

const message = { to: "ana@x.com", subject: "Assunto", html: "<p>oi</p>", text: "oi", idempotencyKey: "loan-notice-1" };

describe("getEmailProvider", () => {
  it("sem chave: dry-run, que não envia", () => {
    const provider = getEmailProvider({});
    expect(provider).toBeInstanceOf(DryRunEmailProvider);
    expect(provider.delivers).toBe(false);
  });

  it("EMAIL_PROVIDER=dry-run força a simulação, mesmo com chave", () => {
    expect(getEmailProvider({ EMAIL_PROVIDER: "dry-run", RESEND_API_KEY: "re_x", EMAIL_FROM: "a@b.c" })).toBeInstanceOf(DryRunEmailProvider);
  });

  it("com chave e remetente: Resend", () => {
    const provider = getEmailProvider({ RESEND_API_KEY: "re_x", EMAIL_FROM: "Biblioteca <a@b.c>" });
    expect(provider).toBeInstanceOf(ResendEmailProvider);
    expect(provider.delivers).toBe(true);
  });

  it("chave sem remetente é erro de configuração", () => {
    expect(() => getEmailProvider({ RESEND_API_KEY: "re_x" })).toThrow("EMAIL_FROM");
  });

  it("provedor desconhecido é erro", () => {
    expect(() => getEmailProvider({ EMAIL_PROVIDER: "sendgrid", RESEND_API_KEY: "re_x" })).toThrow("desconhecido");
  });
});

describe("ResendEmailProvider", () => {
  it("envia o JSON esperado com a chave de idempotência", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const provider = new ResendEmailProvider("re_secret", "Biblioteca <a@b.c>", fetchMock as unknown as typeof fetch);

    expect(await provider.send(message)).toEqual({ status: "sent" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_secret");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("loan-notice-1");
    expect(JSON.parse(init.body as string)).toEqual({ from: "Biblioteca <a@b.c>", to: ["ana@x.com"], subject: "Assunto", html: "<p>oi</p>", text: "oi" });
  });

  it("resposta de erro vira falha só com o código HTTP (sem o corpo)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"to":"ana@x.com"}', { status: 422 }));
    const provider = new ResendEmailProvider("k", "a@b.c", fetchMock as unknown as typeof fetch);
    expect(await provider.send(message)).toEqual({ status: "failed", code: "resend_http_422" });
  });

  it("falha de rede vira falha (não lança)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("boom ana@x.com"));
    const provider = new ResendEmailProvider("k", "a@b.c", fetchMock as unknown as typeof fetch);
    expect(await provider.send(message)).toEqual({ status: "failed", code: "resend_network" });
  });
});
