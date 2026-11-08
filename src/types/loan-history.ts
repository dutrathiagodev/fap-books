// Tipos do histórico de empréstimos (Figma, card 0149). Datas já formatadas pelo servidor (dd/mm/aaaa).

// Aba da tela: o que cada pessoa já pegou, ou por quem cada livro já passou.
export type HistoryTab = "usuario" | "livro";

// Filtro de situação (os chips). "overdue" = em aberto e vencido; "fined" = devolvido com multa gerada.
export type HistoryStatusFilter = "all" | "open" | "returned" | "overdue" | "fined" | "fine_open";

// Situação de uma linha, calculada a partir das datas e da multa.
export type HistoryStatus = "open" | "overdue" | "returned" | "returned_late";

// Tudo o que a tela lê do endereço, já validado.
export interface HistoryFilters {
  tab: HistoryTab;
  // Texto digitado na busca ("" = sem busca).
  query: string;
  // Pessoa ou livro escolhido (uuid) ou null enquanto nada foi escolhido.
  subjectId: string | null;
  // Período em aaaa-mm-dd (o valor do <input type="date">), sobre a data de retirada.
  from: string | null;
  to: string | null;
  status: HistoryStatusFilter;
  page: number;
}

export interface HistoryRowView {
  id: string;
  userName: string;
  initials: string;
  registration: string;
  bookTitle: string;
  code: string;
  borrowedOn: string;
  dueOn: string;
  // null enquanto o livro não voltou.
  returnedOn: string | null;
  renewals: number;
  status: HistoryStatus;
  statusLabel: string;
  daysLate: number;
  // "R$ 8,00" ou "Sem multa"; a nota diz se a multa está em aberto ou paga.
  fineLabel: string;
  fineNote: string | null;
}

// Cartão de cima do resultado: a pessoa ou o livro consultado.
export interface HistorySubject {
  kind: HistoryTab;
  id: string;
  title: string;
  // Linhas de detalhe (ex.: perfil, matrícula e curso; ou autor e tombo).
  details: string[];
}

// Uma opção da lista de busca (o que o usuário escolhe antes de ver o histórico).
export interface HistoryCandidate {
  id: string;
  title: string;
  detail: string;
}

export type HistoryCounts = Record<HistoryStatusFilter, number>;

export interface HistoryPage {
  rows: HistoryRowView[];
  total: number;
  page: number;
  pageSize: number;
  counts: HistoryCounts;
}
