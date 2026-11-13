// Envio de e-mail atrás de uma interface: trocar de provedor é trocar uma variável de ambiente (EMAIL_PROVIDER),
// sem mexer no resto do código. Hoje: Resend (plano gratuito) e "dry-run" (não envia, para teste e para quando falta a chave).

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

// Escolhe o provedor pelo ambiente. Sem RESEND_API_KEY (ou com EMAIL_PROVIDER=dry-run) é o dry-run.
// Com a chave mas sem remetente é erro de configuração: melhor parar do que enviar de um remetente errado.
export function getEmailProvider(env: Record<string, string | undefined> = process.env): EmailProvider {
  const wanted = (env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  const apiKey = env.RESEND_API_KEY?.trim();
  if (wanted === "dry-run" || (!apiKey && (wanted === "" || wanted === "resend"))) return new DryRunEmailProvider();
  if (wanted !== "" && wanted !== "resend") throw new Error(`EMAIL_PROVIDER desconhecido: ${wanted}`);

  const from = env.EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("Falta EMAIL_FROM para enviar com o Resend");
  return new ResendEmailProvider(apiKey, from);
}
