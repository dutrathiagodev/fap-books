// Tipos da tela de multas da funcionária (Figma, cards 0144 a 0146). Datas e valores já formatados pelo servidor.

// Chips de filtro: todas, só em aberto ou só pagas.
export type FineFilter = "all" | "open" | "paid";

export interface FineFilters {
  filter: FineFilter;
  // Busca por nome ou matrícula do usuário.
  query: string;
  page: number;
}

// Uma linha da lista.
export interface FineView {
  id: string;
  userName: string;
  initials: string;
  registration: string;
  bookTitle: string;
  code: string;
  // Prazo de devolução do empréstimo que gerou a multa (dd/mm/aaaa).
  dueOn: string;
  daysLate: number;
  amountCents: number;
  amountLabel: string;
  paid: boolean;
  // Só nas multas pagas: "15/03/2026, 10:42" e o nome de quem registrou a baixa.
  paidAt: string | null;
  paidBy: string | null;
}

export interface FineCounts {
  all: number;
  open: number;
  paid: number;
  // Soma das multas em aberto, em centavos.
  openCents: number;
}

export interface FineList {
  fines: FineView[];
  counts: FineCounts;
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

// "final": erro de regra (repetir não adianta, a tela descarta a chave de idempotência); sem "final", é falha passageira
// (rede, servidor) e a nova tentativa reaproveita a mesma chave.
export type FineActionResult = { ok: true } | { ok: false; message: string; final: boolean };
