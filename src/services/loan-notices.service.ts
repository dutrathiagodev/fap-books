import type { SupabaseClient } from "@supabase/supabase-js";
import { NOTICE_KINDS, buildLoanNoticeEmail, type NoticeKind } from "@/domain/notices/loan-notice";
import type { UserRole } from "@/types/profile";
import type { EmailProvider } from "./email/email-provider";

// Aviso de prazo por e-mail (RF-24). Roda na rota protegida chamada pelo GitHub Actions (avisos-vencimento.yml).
// O banco escolhe e reserva o lote (claim_loan_email_notices); aqui só se monta e envia o e-mail e se informa o resultado.
// Nada de e-mail, nome ou texto do e-mail vai para o log: só contadores e códigos de erro.

export const NOTICE_BATCH_LIMIT = 50;
export const NOTICE_MAX_ATTEMPTS = 3;
// Envios ao mesmo tempo: poucos, para não estourar o limite de requisições por segundo do provedor.
const CONCURRENCY = 5;

export interface NoticeBatchSummary {
  mode: "envio" | "simulacao";
  selected: number;
  sent: number;
  failed: number;
  // Enviado ao provedor, mas o banco não confirmou (a próxima execução tenta; a chave de idempotência evita duplicar).
  notRecorded: number;
}

interface NoticeRow {
  notice_id: string | null;
  kind: NoticeKind;
  due_at: string;
  days_late: number;
  email: string;
  full_name: string;
  role: UserRole;
  book_title: string;
}

const ROLES: readonly string[] = ["student", "teacher", "librarian"];

// O que o banco devolve é dado externo para o TypeScript: confere o formato antes de usar.
function isNoticeRow(value: unknown): value is NoticeRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    NOTICE_KINDS.includes(row.kind as NoticeKind) &&
    typeof row.due_at === "string" &&
    !Number.isNaN(Date.parse(row.due_at)) &&
    typeof row.days_late === "number" &&
    typeof row.email === "string" &&
    row.email.length > 0 &&
    typeof row.full_name === "string" &&
    typeof row.book_title === "string" &&
    typeof row.role === "string" &&
    ROLES.includes(row.role)
  );
}

export async function runLoanNoticeBatch(options: {
  admin: SupabaseClient;
  provider: EmailProvider;
  siteOrigin: string;
  limit?: number;
}): Promise<NoticeBatchSummary> {
  const { admin, provider, siteOrigin } = options;
  const summary: NoticeBatchSummary = {
    mode: provider.delivers ? "envio" : "simulacao",
    selected: 0,
    sent: 0,
    failed: 0,
    notRecorded: 0,
  };

  const { data, error } = await admin.rpc("claim_loan_email_notices", {
    p_limit: options.limit ?? NOTICE_BATCH_LIMIT,
    p_max_attempts: NOTICE_MAX_ATTEMPTS,
    p_dry_run: !provider.delivers,
  });
  if (error) throw new Error(`Falha ao selecionar os avisos (${error.code ?? "sem código"})`);

  const rows = (Array.isArray(data) ? data : []).filter(isNoticeRow);
  summary.selected = rows.length;
  // Simulação: só conta quantos seriam enviados. Nada é reservado nem enviado.
  if (!provider.delivers) return summary;

  for (let start = 0; start < rows.length; start += CONCURRENCY) {
    const results = await Promise.all(rows.slice(start, start + CONCURRENCY).map((row) => sendOne(row, admin, provider, siteOrigin)));
    for (const result of results) summary[result] += 1;
  }
  return summary;
}

async function sendOne(
  row: NoticeRow,
  admin: SupabaseClient,
  provider: EmailProvider,
  siteOrigin: string,
): Promise<"sent" | "failed" | "notRecorded"> {
  const email = buildLoanNoticeEmail({
    kind: row.kind,
    fullName: row.full_name,
    bookTitle: row.book_title,
    dueAt: new Date(row.due_at),
    daysLate: row.days_late,
    role: row.role,
    siteOrigin,
  });

  const result = await provider.send({ to: row.email, idempotencyKey: `loan-notice-${row.notice_id}`, ...email });
  if (result.status !== "sent") {
    console.error(`Aviso de prazo não enviado (${result.code})`);
    return "failed";
  }

  const { error } = await admin.rpc("finish_loan_email_notice", { p_notice_id: row.notice_id, p_sent: true });
  if (error) {
    console.error(`Aviso enviado, mas o registro falhou (${error.code ?? "sem código"})`);
    return "notRecorded";
  }
  return "sent";
}
