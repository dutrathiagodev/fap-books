// Tipos dos relatórios da bibliotecária (Figma, card 0153; RF-27 a RF-29). Datas já formatadas pelo servidor (dd/mm/aaaa).

// Os três relatórios: livros em atraso, acervo por categoria e reservas pedagógicas.
export type ReportKind = "atraso" | "acervo" | "reservas";

// Situação do relatório de atraso: ainda em atraso, devolvido com atraso ou os dois.
export type OverdueStatus = "open" | "returned" | "all";

// Situação da reserva pedagógica (o mesmo texto do banco), ou todas.
export type PedagogicalStatus = "all" | "pending" | "approved" | "rejected" | "returned" | "cancelled";

export type ReportStatus = OverdueStatus | PedagogicalStatus;

// Filtros lidos do endereço. Datas aaaa-mm-dd. O acervo é um retrato de hoje e não usa período nem situação.
export interface ReportFilters {
  kind: ReportKind;
  from: string | null;
  to: string | null;
  status: ReportStatus;
  page: number;
}

export interface OverdueRowView {
  id: string;
  userName: string;
  registration: string;
  bookTitle: string;
  code: string;
  dueOn: string;
  returnedOn: string | null;
  daysLate: number;
  fineCents: number;
}

export interface InventoryRowView {
  category: string;
  titles: number;
  copies: number;
  borrowed: number;
  held: number;
  available: number;
  inactiveTitles: number;
  inactiveCopies: number;
}

export interface PedagogicalRowView {
  id: string;
  teacherName: string;
  status: Exclude<PedagogicalStatus, "all">;
  requestedOn: string;
  startOn: string;
  days: number;
  purpose: string | null;
  bookCount: number;
  bookTitles: string[];
}

// Um número em destaque no alto do relatório (os "totais gerais").
export interface ReportIndicator {
  label: string;
  value: string;
  tone?: "default" | "danger";
}

// Resultado de um relatório: a página pedida, o total do filtro inteiro e os indicadores.
export interface ReportPage<Row> {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  indicators: ReportIndicator[];
}

export type OverdueReport = ReportPage<OverdueRowView>;
export type InventoryReport = ReportPage<InventoryRowView>;
export type PedagogicalReport = ReportPage<PedagogicalRowView>;

// Tabela pronta para exportar (CSV e PDF): títulos de coluna e linhas de texto.
export interface ExportTable {
  title: string;
  // Filtros aplicados, em texto ("Situação: Em atraso · Prazo de 01/11/2026 até 13/11/2026").
  subtitle: string;
  headers: string[];
  rows: string[][];
  // Linhas que existem além das exportadas (a exportação tem teto). 0 = tudo foi exportado.
  omitted: number;
}
