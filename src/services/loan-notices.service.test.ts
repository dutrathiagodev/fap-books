import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DryRunEmailProvider, type EmailMessage, type EmailProvider, type SendResult } from "./email/email-provider";
import { runLoanNoticeBatch } from "./loan-notices.service";

const row = (n: number, overrides: Record<string, unknown> = {}) => ({
  notice_id: `n-${n}`,
  kind: "due_soon",
  due_at: "2026-11-15T21:00:00+00:00",
  days_late: 0,
  email: `pessoa${n}@x.com`,
  full_name: `Pessoa ${n}`,
  role: "student",
  book_title: `Livro ${n}`,
  ...overrides,
});

function fakeAdmin(rows: unknown[], finishError: { code: string } | null = null) {
  const rpc = vi.fn(async (...call: [name: string, args?: unknown]) => (call[0] === "claim_loan_email_notices" ? { data: rows, error: null } : { data: true, error: finishError }));
  return { admin: { rpc } as unknown as SupabaseClient, rpc };
}

class FakeProvider implements EmailProvider {
  readonly name = "fake";
  readonly delivers = true;
  sent: EmailMessage[] = [];
  constructor(private readonly failFor: string[] = []) {}
  async send(message: EmailMessage): Promise<SendResult> {
    if (this.failFor.includes(message.to)) return { status: "failed", code: "resend_http_500" };
    this.sent.push(message);
    return { status: "sent" };
  }
}

const options = { siteOrigin: "https://fap-books.vercel.app" };

afterEach(() => vi.restoreAllMocks());

describe("runLoanNoticeBatch", () => {
  it("envia cada aviso e o marca como enviado, com chave de idempotência por aviso", async () => {
    const { admin, rpc } = fakeAdmin([row(1), row(2, { kind: "overdue", days_late: 2 })]);
    const provider = new FakeProvider();

    const summary = await runLoanNoticeBatch({ admin, provider, ...options });

    expect(summary).toEqual({ mode: "envio", selected: 2, sent: 2, failed: 0, notRecorded: 0 });
    expect(provider.sent.map((m) => m.to)).toEqual(["pessoa1@x.com", "pessoa2@x.com"]);
    expect(provider.sent.map((m) => m.idempotencyKey)).toEqual(["loan-notice-n-1", "loan-notice-n-2"]);
    expect(rpc).toHaveBeenCalledWith("claim_loan_email_notices", { p_limit: 50, p_max_attempts: 3, p_dry_run: false });
    expect(rpc).toHaveBeenCalledWith("finish_loan_email_notice", { p_notice_id: "n-1", p_sent: true });
  });

  it("falha de envio NÃO marca como enviado (a próxima execução tenta de novo)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { admin, rpc } = fakeAdmin([row(1), row(2)]);
    const provider = new FakeProvider(["pessoa1@x.com"]);

    const summary = await runLoanNoticeBatch({ admin, provider, ...options });

    expect(summary).toMatchObject({ selected: 2, sent: 1, failed: 1 });
    const finishCalls = rpc.mock.calls.filter(([name]) => name === "finish_loan_email_notice");
    expect(finishCalls).toHaveLength(1);
    expect(finishCalls[0][1]).toEqual({ p_notice_id: "n-2", p_sent: true });
  });

  it("não escreve e-mail nem nome da pessoa no log", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { admin } = fakeAdmin([row(1)]);
    await runLoanNoticeBatch({ admin, provider: new FakeProvider(["pessoa1@x.com"]), ...options });
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain("pessoa1");
    expect(logged).not.toContain("Livro 1");
  });

  it("enviado mas o banco não confirmou: conta à parte", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { admin } = fakeAdmin([row(1)], { code: "08006" });
    const summary = await runLoanNoticeBatch({ admin, provider: new FakeProvider(), ...options });
    expect(summary).toMatchObject({ sent: 0, notRecorded: 1 });
  });

  it("dry-run: só simula (pede ao banco sem reservar) e não envia nada", async () => {
    const { admin, rpc } = fakeAdmin([row(1), row(2)]);
    const summary = await runLoanNoticeBatch({ admin, provider: new DryRunEmailProvider(), ...options });

    expect(summary).toEqual({ mode: "simulacao", selected: 2, sent: 0, failed: 0, notRecorded: 0 });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("claim_loan_email_notices", { p_limit: 50, p_max_attempts: 3, p_dry_run: true });
  });

  it("ignora linha com formato inesperado em vez de enviar errado", async () => {
    const { admin } = fakeAdmin([row(1), { kind: "outra", email: "x@y.z" }, row(3, { email: "" })]);
    const provider = new FakeProvider();
    const summary = await runLoanNoticeBatch({ admin, provider, ...options });
    expect(summary.selected).toBe(1);
    expect(provider.sent).toHaveLength(1);
  });

  it("erro do banco na seleção interrompe sem enviar", async () => {
    const admin = { rpc: vi.fn(async () => ({ data: null, error: { code: "42501" } })) } as unknown as SupabaseClient;
    const provider = new FakeProvider();
    await expect(runLoanNoticeBatch({ admin, provider, ...options })).rejects.toThrow("42501");
    expect(provider.sent).toHaveLength(0);
  });

  it("respeita o limite pedido", async () => {
    const { admin, rpc } = fakeAdmin([]);
    await runLoanNoticeBatch({ admin, provider: new FakeProvider(), ...options, limit: 10 });
    expect(rpc).toHaveBeenCalledWith("claim_loan_email_notices", expect.objectContaining({ p_limit: 10 }));
  });
});
