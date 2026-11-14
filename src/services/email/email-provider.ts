import nodemailer from "nodemailer";

// Envio de e-mail atrás de uma interface: trocar de provedor é trocar uma variável de ambiente (EMAIL_PROVIDER),
// sem mexer no resto do código. Tudo gratuito, nada exige domínio próprio:
//   dry-run (padrão e dos testes: não envia) | smtp (Gmail com senha de app, Brevo etc.) | resend (opcional).

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  // Repetir o mesmo envio com a mesma chave não gera e-mail duplicado (o Resend guarda a chave por 24 horas).
  idempotencyKey: string;
}

export type SendResult = { status: "sent" } | { status: "failed"; code: string };

export interface EmailProvider {
  readonly name: string;
  // false = não envia de verdade. A tarefa então só simula: não reserva nem marca nenhum aviso.
  readonly delivers: boolean;
  send(message: EmailMessage): Promise<SendResult>;
}

// Não envia nada e não registra e-mail nem texto (LGPD): só existe para teste e para a falta da chave.
export class DryRunEmailProvider implements EmailProvider {
  readonly name = "dry-run";
  readonly delivers = false;

  async send(): Promise<SendResult> {
    return { status: "failed", code: "dry_run" };
  }
}

const RESEND_URL = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 10_000;

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  readonly delivers = true;

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const response = await this.fetchImpl(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey,
        },
        body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
        signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
      });
      if (response.ok) return { status: "sent" };
      // Só o código HTTP vai para o log: o corpo da resposta pode repetir o e-mail da pessoa.
      return { status: "failed", code: `resend_http_${response.status}` };
    } catch {
      return { status: "failed", code: "resend_network" };
    }
  }
}

// SMTP genérico (nodemailer): serve para Gmail com senha de app (smtp.gmail.com) e para Brevo (smtp-relay.brevo.com).
// SMTP não tem chave de idempotência: se o e-mail sair e o banco não registrar, a nova tentativa pode repetir o aviso (raro).
export interface SmtpTransport {
  sendMail(message: { from: string; to: string; subject: string; html: string; text: string }): Promise<unknown>;
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  readonly delivers = true;

  constructor(
    private readonly transport: SmtpTransport,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      await this.transport.sendMail({ from: this.from, to: message.to, subject: message.subject, html: message.html, text: message.text });
      return { status: "sent" };
    } catch (error) {
      // Só o código do erro (ex.: EAUTH, ETIMEDOUT): a mensagem pode repetir o e-mail da pessoa.
      const code = error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : "error";
      return { status: "failed", code: `smtp_${code}` };
    }
  }
}

function createSmtpProvider(env: Record<string, string | undefined>): EmailProvider {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const password = env.SMTP_PASSWORD;
  const from = env.EMAIL_FROM?.trim();
  if (!host || !user || !password || !from) throw new Error("Faltam SMTP_HOST, SMTP_USER, SMTP_PASSWORD ou EMAIL_FROM");
  const port = Number(env.SMTP_PORT ?? 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("SMTP_PORT inválida");

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = TLS direto; 587 = STARTTLS (exigido)
    requireTLS: port !== 465,
    auth: { user, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return new SmtpEmailProvider(transport, from);
}

// Escolhe o provedor pelo ambiente. EMAIL_PROVIDER = dry-run | smtp | resend. Vazio: smtp se houver SMTP_HOST, senão
// resend se houver RESEND_API_KEY, senão dry-run (não envia nada: a tarefa só simula).
// Provedor escolhido com configuração incompleta é erro: melhor parar do que enviar de um remetente errado.
export function getEmailProvider(env: Record<string, string | undefined> = process.env): EmailProvider {
  const wanted = (env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  const apiKey = env.RESEND_API_KEY?.trim();

  const kind = wanted || (env.SMTP_HOST?.trim() ? "smtp" : apiKey ? "resend" : "dry-run");
  switch (kind) {
    case "dry-run":
      return new DryRunEmailProvider();
    case "smtp":
      return createSmtpProvider(env);
    case "resend": {
      const from = env.EMAIL_FROM?.trim();
      if (!apiKey || !from) throw new Error("Faltam RESEND_API_KEY ou EMAIL_FROM para enviar com o Resend");
      return new ResendEmailProvider(apiKey, from);
    }
    default:
      throw new Error(`EMAIL_PROVIDER desconhecido: ${kind}`);
  }
}
