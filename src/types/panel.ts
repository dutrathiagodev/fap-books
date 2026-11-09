// Tipos do painel da bibliotecária e dos avisos de prazo (Figma, cards 0157 e 0147). Datas e valores já formatados pelo servidor.

// Situação do prazo de um empréstimo em aberto: já passou (atrasado), vence hoje ou vence nos próximos dias.
export type DeadlineStatus = "overdue" | "today" | "soon";

// Chips da tela de avisos: todos ou um só tipo de situação.
export type NoticeFilter = "all" | DeadlineStatus;

// Contadores do dia, como a função panel_summary() devolve (já em camelCase).
export interface PanelSummary {
  borrowed: number;
  overdue: number;
  dueToday: number;
  dueSoon: number;
  availableCopies: number;
  openFines: number;
  openFinesCents: number;
  pendingPedagogical: number;
}

// Um aviso de prazo: um empréstimo em aberto que vence em breve, hoje ou já venceu.
export interface DeadlineNoticeView {
  id: string;
  status: DeadlineStatus;
  userName: string;
  bookTitle: string;
  // Tombo do livro: leva ao empréstimo na aba de devolução.
  code: string;
  // dd/mm/aaaa
  dueOn: string;
  // "Faltam 2 dias", "Vence hoje" ou "4 dias de atraso".
  whenLabel: string;
  // "Multa: R$ 4,00" (nos que ainda não venceram, "Multa: R$ 0,00").
  fineLabel: string;
  // Dias de atraso (0 se ainda não venceu).
  daysLate: number;
  fineCents: number;
  // Link do WhatsApp com a mensagem pronta (a funcionária envia). null quando a pessoa não tem telefone válido cadastrado.
  whatsappUrl: string | null;
}

// Reserva pedagógica aguardando decisão (só leitura: a fila de aprovação é de outra tela).
export interface PendingPedagogicalView {
  id: string;
  teacherName: string;
  bookTitles: string[];
}

// Uma linha da lista "Pendências de hoje".
export interface PendingItem {
  key: string;
  title: string;
  detail: string;
  badge: string;
  tone: "warning" | "info" | "danger";
  actionLabel: string;
  href: string;
}
