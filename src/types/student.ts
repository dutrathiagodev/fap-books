// Tipos da Área do aluno (Figma, cards 0212 a 0217). Datas e valores já formatados pelo servidor.
import type { DeadlineStatus } from "./panel";

// Contadores do resumo: livros com o aluno, limite, prazos e multa em aberto.
export interface StudentSummary {
  borrowed: number;
  limit: number;
  remaining: number;
  overdue: number;
  dueToday: number;
  dueSoon: number;
  openFineCents: number;
  openFineLabel: string;
}

// Um empréstimo em aberto do próprio aluno.
export interface MyLoanView {
  id: string;
  bookTitle: string;
  code: string;
  borrowedOn: string;
  dueOn: string;
  // Novo prazo se renovar (prazo atual + 7 dias).
  newDueOn: string;
  // null quando o prazo ainda está longe (mais de 2 dias).
  status: DeadlineStatus | null;
  whenLabel: string;
  renewals: number;
  renewalsLabel: string;
  // Motivo em português quando não pode renovar (limite, atraso ou multa); null quando pode.
  renewBlocked: string | null;
}

export type MyReservationStatus = "waiting" | "ready" | "fulfilled" | "cancelled";

// Reserva de livro indisponível feita pelo próprio aluno.
export interface MyReservationView {
  id: string;
  bookTitle: string;
  code: string;
  status: MyReservationStatus;
  statusLabel: string;
  // Texto que explica o que acontece agora (ex.: "Retire na biblioteca").
  hint: string;
  requestedOn: string;
}

// Multa do próprio aluno.
export interface MyFineView {
  id: string;
  bookTitle: string;
  code: string;
  dueOn: string;
  daysLate: number;
  amountLabel: string;
  paid: boolean;
  paidOn: string | null;
}
