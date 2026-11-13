import { deadlineStatus, whenLabel, daysUntilDue } from "../panel/panel-rules";
import {
  calculateDaysLate,
  formatLoanDate,
  formatReais,
  loanLimitFor,
  renewBlockReason,
  renewedDueDate,
  RENEW_BLOCK_MESSAGES,
} from "../loans/loan-rules";
import { renewalsLabel } from "../loans/loan-views";
import type { MyFineView, MyLoanView, MyReservationStatus, MyReservationView, StudentSummary } from "@/types/student";

// Regras da Área do aluno (PRD RF-10 a RF-15 e RF-21 a RF-22). Só contas e textos: a leitura dos dados é do service.

export const STUDENT_HOME_PATH = "/aluno";
export const STUDENT_LOANS_PATH = "/aluno/emprestimos";
export const STUDENT_RESERVATIONS_PATH = "/aluno/reservas";
export const STUDENT_FINES_PATH = "/aluno/multas";

// Multa só se paga no balcão da biblioteca: o sistema não cobra online (decisão do PRD).
export const FINE_PAYMENT_NOTICE = "O pagamento da multa é feito somente na biblioteca, com a bibliotecária.";

// ---- Empréstimos ----

export interface MyLoanRow {
  id: string;
  borrowed_at: string;
  due_at: string;
  renewals: number;
  books: { title: string; code: string } | null;
}

// Monta a linha da tela. "now" entra de fora para o cálculo ser testável.
// A renovação só é liberada se não houver atraso, multa em aberto nem o limite de renovações (o banco confere de novo).
export function toMyLoanView(row: MyLoanRow, now: Date, openFineCents: number): MyLoanView {
  const dueAt = new Date(row.due_at);
  const status = deadlineStatus(dueAt, now);
  const days = status === "overdue" ? calculateDaysLate(dueAt, now) : daysUntilDue(dueAt, now);
  const blocked = renewBlockReason({ renewals: row.renewals, dueAt, now, openFineCents });
  return {
    id: row.id,
    bookTitle: row.books?.title ?? "Livro removido",
    code: row.books?.code ?? "—",
    borrowedOn: formatLoanDate(new Date(row.borrowed_at)),
    dueOn: formatLoanDate(dueAt),
    newDueOn: formatLoanDate(renewedDueDate(dueAt)),
    status,
    // Prazo longe (fora da janela de aviso): só a data, sem contagem.
    whenLabel: status ? whenLabel(status, days) : `Vence em ${formatLoanDate(dueAt)}`,
    renewals: row.renewals,
    renewalsLabel: renewalsLabel(row.renewals),
    renewBlocked: blocked ? RENEW_BLOCK_MESSAGES[blocked] : null,
  };
}

// ---- Resumo ----

export function buildStudentSummary(input: {
  loans: Pick<MyLoanView, "status">[];
  graduating: boolean;
  openFineCents: number;
}): StudentSummary {
  const limit = loanLimitFor(input.graduating);
  const count = (status: "overdue" | "today" | "soon") => input.loans.filter((loan) => loan.status === status).length;
  return {
    borrowed: input.loans.length,
    limit,
    remaining: Math.max(0, limit - input.loans.length),
    overdue: count("overdue"),
    dueToday: count("today"),
    dueSoon: count("soon"),
    openFineCents: input.openFineCents,
    openFineLabel: formatReais(input.openFineCents),
  };
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

// Frase do aviso de prazos: "Atenção: 1 livro vence em até 2 dias e 1 está atrasado." Sem nada a avisar, null.
export function studentNoticeSentence(summary: Pick<StudentSummary, "dueToday" | "dueSoon" | "overdue">): string | null {
  const upcoming = summary.dueToday + summary.dueSoon;
  const parts: string[] = [];
  if (upcoming > 0) parts.push(`${plural(upcoming, "livro vence", "livros vencem")} em até 2 dias`);
  if (summary.overdue > 0) parts.push(`${summary.overdue} ${summary.overdue === 1 ? "está atrasado" : "estão atrasados"}`);
  return parts.length === 0 ? null : `Atenção: ${parts.join(" e ")}.`;
}

// Os que pedem atenção primeiro: atrasados, depois hoje, depois a vencer; os demais por prazo.
const STATUS_ORDER = { overdue: 0, today: 1, soon: 2 } as const;
export function sortLoansByUrgency<T extends Pick<MyLoanView, "status">>(loans: T[]): T[] {
  const rank = (loan: T) => (loan.status ? STATUS_ORDER[loan.status] : 3);
  return [...loans].sort((a, b) => rank(a) - rank(b));
}

// ---- Reservas ----

const RESERVATION_TEXTS: Record<MyReservationStatus, { label: string; hint: string }> = {
  waiting: { label: "Na fila", hint: "Você será avisado quando o livro estiver disponível." },
  ready: { label: "Pronta para retirar", hint: "Retire o livro na biblioteca no horário de funcionamento." },
  fulfilled: { label: "Retirada", hint: "O livro já foi emprestado a você." },
  cancelled: { label: "Cancelada", hint: "Esta reserva foi cancelada." },
};

export interface MyReservationRow {
  id: string;
  status: MyReservationStatus;
  created_at: string;
  books: { title: string; code: string } | null;
}

export function toMyReservationView(row: MyReservationRow): MyReservationView {
  const texts = RESERVATION_TEXTS[row.status];
  return {
    id: row.id,
    bookTitle: row.books?.title ?? "Livro removido",
    code: row.books?.code ?? "—",
    status: row.status,
    statusLabel: texts.label,
    hint: texts.hint,
    requestedOn: formatLoanDate(new Date(row.created_at)),
  };
}

// ---- Multas ----

export interface MyFineRow {
  id: string;
  days_late: number;
  amount_cents: number;
  paid_at: string | null;
  loans: { due_at: string; books: { title: string; code: string } | null } | null;
}

export function toMyFineView(row: MyFineRow): MyFineView {
  return {
    id: row.id,
    bookTitle: row.loans?.books?.title ?? "Livro removido",
    code: row.loans?.books?.code ?? "—",
    dueOn: row.loans ? formatLoanDate(new Date(row.loans.due_at)) : "—",
    daysLate: row.days_late,
    amountLabel: formatReais(row.amount_cents),
    paid: row.paid_at !== null,
    paidOn: row.paid_at ? formatLoanDate(new Date(row.paid_at)) : null,
  };
}
