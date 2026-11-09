import { formatNumber } from "../format";

// Regras oficiais da biblioteca (Regulamento 2025, PRD RF-10 a RF-15 e RF-21 a RF-22).
export const LOAN_PERIOD_DAYS = 7;
export const LOAN_LIMIT = 3;
export const GRADUATE_LOAN_LIMIT = 4;
export const FINE_PER_DAY_CENTS = 100;
export const MAX_RENEWALS = 3;

// A biblioteca fica em Curitiba: dias de atraso e datas na tela contam pelo calendário de Brasília.
const TIME_ZONE = "America/Sao_Paulo";
const DAY_MS = 24 * 60 * 60 * 1000;

// Limite de livros ao mesmo tempo: 3, ou 4 para formandos.
export function loanLimitFor(graduating = false): number {
  return graduating ? GRADUATE_LOAN_LIMIT : LOAN_LIMIT;
}

// Pode pegar mais um livro? O 3º empréstimo passa e o 4º não (formando: o 4º passa e o 5º não).
export function canBorrow(activeLoans: number, graduating = false): boolean {
  return activeLoans < loanLimitFor(graduating);
}

// Prazo de devolução: a retirada mais 7 dias (ou o prazo da reserva pedagógica, quando for o caso).
// O Brasil não tem horário de verão desde 2019, então somar dias de 24 h mantém a hora local.
export function calculateDueDate(borrowedAt: Date, days = LOAN_PERIOD_DAYS): Date {
  return new Date(borrowedAt.getTime() + days * DAY_MS);
}

// "2026-10-27": o dia do calendário de Brasília em que o instante cai.
export function localDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

// "27/10/2026".
export function formatLoanDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(
    date,
  );
}

// "R$ 8,00" a partir de centavos.
export function formatReais(cents: number): string {
  return `R$ ${formatNumber(cents / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Vencido = o prazo já passou (o banco compara o instante, não o dia). Bloqueia novo empréstimo e renovação;
// a multa, por outro lado, só começa no dia seguinte (calculateDaysLate).
export function isOverdue(dueAt: Date, now: Date): boolean {
  return dueAt.getTime() < now.getTime();
}

// Dias de atraso: devolver no dia do prazo (a qualquer hora) não é atraso; o dia seguinte já é 1 dia.
export function calculateDaysLate(dueAt: Date, returnedAt: Date): number {
  const diff = (Date.parse(localDay(returnedAt)) - Date.parse(localDay(dueAt))) / DAY_MS;
  return Math.max(0, Math.round(diff));
}

// Multa por atraso: R$ 1,00 por dia, em centavos. Sem atraso, sem multa.
export function calculateFine(dueAt: Date, returnedAt: Date): { daysLate: number; amountCents: number } {
  const daysLate = calculateDaysLate(dueAt, returnedAt);
  return { daysLate, amountCents: daysLate * FINE_PER_DAY_CENTS };
}

// Frase do aviso de devolução com atraso (Figma 6574-1777): "multa calculada de R$ 1,00 × 4 dias = R$ 4,00".
export function fineSentence(daysLate: number): string {
  const total = formatReais(daysLate * FINE_PER_DAY_CENTS);
  return `multa calculada de ${formatReais(FINE_PER_DAY_CENTS)} × ${daysLate} ${daysLate === 1 ? "dia" : "dias"} = ${total}`;
}

// ---- Quem pode pegar este livro agora (RF-14 e RF-15) ----

export type LoanBlockReason = "open_fine" | "overdue_loan" | "limit_reached" | "book_unavailable" | "already_has_book";

export const LOAN_BLOCK_MESSAGES: Record<LoanBlockReason, string> = {
  open_fine: "Usuário com multa em aberto. Dê baixa na multa antes de registrar um novo empréstimo.",
  overdue_loan: "Usuário com livro em atraso. A devolução precisa ser registrada antes de um novo empréstimo.",
  limit_reached: "Usuário já está no limite de livros emprestados.",
  book_unavailable: "Não há exemplar livre deste livro: todos estão emprestados ou reservados.",
  already_has_book: "Este usuário já está com um exemplar deste livro.",
};

export interface LoanEligibilityInput {
  activeLoans: number;
  graduating?: boolean;
  openFineCents: number;
  // Algum empréstimo em aberto do usuário já passou do prazo.
  hasOverdueLoan: boolean;
  // Já está com este mesmo livro em aberto.
  hasThisBook: boolean;
  freeCopies: number;
}

// Primeiro motivo que bloqueia o empréstimo, ou null se pode registrar. A ordem é a do aviso mais útil para o balcão:
// multa e atraso primeiro (o usuário precisa resolver), depois limite e depois o livro.
export function loanBlockReason(input: LoanEligibilityInput): LoanBlockReason | null {
  if (input.openFineCents > 0) return "open_fine";
  if (input.hasOverdueLoan) return "overdue_loan";
  if (!canBorrow(input.activeLoans, input.graduating)) return "limit_reached";
  if (input.hasThisBook) return "already_has_book";
  if (input.freeCopies <= 0) return "book_unavailable";
  return null;
}

// Aviso informativo do resumo (Figma 6574-1330): "Limite de 3 livros por usuário: restam 1. Prazo padrão de 7 dias."
export function limitNotice(activeLoans: number, graduating = false): string {
  const limit = loanLimitFor(graduating);
  const left = Math.max(0, limit - activeLoans);
  return `Limite de ${limit} livros por usuário: restam ${left}. Prazo padrão de ${LOAN_PERIOD_DAYS} dias.`;
}

// ---- Renovação ----

export type RenewBlockReason = "limit" | "overdue" | "open_fine";

export const RENEW_BLOCK_MESSAGES: Record<RenewBlockReason, string> = {
  limit: `Este empréstimo já foi renovado ${MAX_RENEWALS} vezes.`,
  overdue: "Empréstimo em atraso não pode ser renovado: registre a devolução.",
  open_fine: "Usuário com multa em aberto não pode renovar.",
};

export function renewBlockReason(input: {
  renewals: number;
  dueAt: Date;
  now: Date;
  openFineCents: number;
}): RenewBlockReason | null {
  if (input.renewals >= MAX_RENEWALS) return "limit";
  if (isOverdue(input.dueAt, input.now)) return "overdue";
  if (input.openFineCents > 0) return "open_fine";
  return null;
}

// Novo prazo (decisão do dono): o prazo atual mais 7 dias, a cada renovação (até MAX_RENEWALS vezes).
export function renewedDueDate(dueAt: Date): Date {
  return calculateDueDate(dueAt);
}
