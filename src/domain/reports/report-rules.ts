import { parseIsoDate, periodError } from "../history/history-rules";
import { formatReais } from "../fines/fine-rules";
import { formatNumber } from "../format";
import type {
  OverdueStatus,
  PedagogicalStatus,
  ReportFilters,
  ReportIndicator,
  ReportKind,
  ReportStatus,
} from "@/types/report";

export const REPORTS_PATH = "/funcionario/relatorios";
export const REPORT_EXPORT_PATH = `${REPORTS_PATH}/exportar`;
export const REPORT_PAGE_SIZE = 10;
// Teto de linhas de uma exportação (o PostgREST também corta em 1000 sem avisar).
export const REPORT_EXPORT_LIMIT = 1000;
// Teto da página pedida no endereço: ninguém navega tanto, e o número alto só serviria para forçar consultas vazias.
const MAX_PAGE = 10_000;

export const REPORT_KINDS: { kind: ReportKind; label: string; description: string }[] = [
  { kind: "atraso", label: "Livros em atraso", description: "Quem está com livro fora do prazo, há quantos dias e a multa estimada." },
  { kind: "acervo", label: "Acervo", description: "Exemplares por categoria: disponíveis, emprestados, reservados e inativos." },
  { kind: "reservas", label: "Reservas pedagógicas", description: "Pedidos dos professores por situação e período, com os livros de cada um." },
];

export const OVERDUE_STATUS_OPTIONS: { value: OverdueStatus; label: string }[] = [
  { value: "open", label: "Em atraso" },
  { value: "returned", label: "Devolvidos com atraso" },
  { value: "all", label: "Todos" },
];

export const PEDAGOGICAL_STATUS_OPTIONS: { value: PedagogicalStatus; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Aguardando" },
  { value: "approved", label: "Aprovadas" },
  { value: "rejected", label: "Recusadas" },
  { value: "returned", label: "Devolvidas" },
  { value: "cancelled", label: "Canceladas" },
];

export const PEDAGOGICAL_STATUS_LABELS: Record<Exclude<PedagogicalStatus, "all">, string> = {
  pending: "Aguardando",
  approved: "Aprovada",
  rejected: "Recusada",
  returned: "Devolvida",
  cancelled: "Cancelada",
};

const KINDS = new Set<string>(REPORT_KINDS.map((item) => item.kind));
const DEFAULT_STATUS: Record<ReportKind, ReportStatus> = { atraso: "open", acervo: "all", reservas: "all" };

function validStatuses(kind: ReportKind): string[] {
  if (kind === "atraso") return OVERDUE_STATUS_OPTIONS.map((item) => item.value);
  if (kind === "reservas") return PEDAGOGICAL_STATUS_OPTIONS.map((item) => item.value);
  return ["all"];
}

function firstOf(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : (value?.[0] ?? "");
}

// Lê e valida o endereço (?tipo=, ?de=, ?ate=, ?situacao= e ?pagina=): o que vier inválido volta ao padrão, sem erro.
// O acervo é um retrato de hoje: ignora período e situação.
export function parseReportFilters(params: Record<string, string | string[] | undefined>): ReportFilters {
  const rawKind = firstOf(params.tipo);
  const kind: ReportKind = KINDS.has(rawKind) ? (rawKind as ReportKind) : "atraso";
  const rawStatus = firstOf(params.situacao);
  const status = validStatuses(kind).includes(rawStatus) ? (rawStatus as ReportStatus) : DEFAULT_STATUS[kind];
  const page = Number.parseInt(firstOf(params.pagina), 10);
  const usesPeriod = kind !== "acervo";
  return {
    kind,
    from: usesPeriod ? parseIsoDate(firstOf(params.de)) : null,
    to: usesPeriod ? parseIsoDate(firstOf(params.ate)) : null,
    status,
    page: Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1,
  };
}

// Período com as datas trocadas não faz sentido: a tela avisa e consulta sem período.
export function reportPeriodError(filters: Pick<ReportFilters, "from" | "to">): string | null {
  return periodError(filters);
}

// Datas que realmente filtram (período inválido não filtra, como no histórico).
export function effectivePeriod(filters: Pick<ReportFilters, "from" | "to">): { from: string | null; to: string | null } {
  return periodError(filters) ? { from: null, to: null } : { from: filters.from, to: filters.to };
}

// Endereço da tela com os filtros. Os padrões (atraso, situação padrão, página 1) não aparecem no endereço.
export function reportHref(filters: ReportFilters, changes: Partial<ReportFilters> = {}, path = REPORTS_PATH): string {
  const next = { ...filters, ...changes };
  const search = new URLSearchParams();
  if (next.kind !== "atraso") search.set("tipo", next.kind);
  if (next.kind !== "acervo") {
    if (next.from) search.set("de", next.from);
    if (next.to) search.set("ate", next.to);
    if (next.status !== DEFAULT_STATUS[next.kind]) search.set("situacao", next.status);
  }
  if (next.page > 1) search.set("pagina", String(next.page));
  const text = search.toString();
  return text ? `${path}?${text}` : path;
}

// Endereço da exportação: os mesmos filtros, sem página, mais o formato.
export function reportExportHref(filters: ReportFilters, format: "csv" | "pdf"): string {
  const base = reportHref(filters, { page: 1 }, REPORT_EXPORT_PATH);
  return `${base}${base.includes("?") ? "&" : "?"}formato=${format}`;
}

export function parseExportFormat(raw: string | null): "csv" | "pdf" | null {
  return raw === "csv" || raw === "pdf" ? raw : null;
}

// "Mostrando 1-10 de 23 registros".
export function reportSummary(page: number, pageSize: number, shown: number, total: number, noun: [string, string]): string {
  if (total === 0 || shown === 0) return `Nenhum ${noun[0]}`;
  const first = (page - 1) * pageSize + 1;
  return `Mostrando ${first}-${first + shown - 1} de ${formatNumber(total)} ${total === 1 ? noun[0] : noun[1]}`;
}

export function statusLabel(kind: ReportKind, status: ReportStatus): string {
  const options = kind === "atraso" ? OVERDUE_STATUS_OPTIONS : kind === "reservas" ? PEDAGOGICAL_STATUS_OPTIONS : [];
  return options.find((item) => item.value === status)?.label ?? "";
}

// Texto dos filtros aplicados, para o subtítulo da exportação: "Situação: Em atraso · Prazo de 01/11/2026 até 13/11/2026".
export function filtersText(filters: ReportFilters): string {
  if (filters.kind === "acervo") return "Retrato do acervo na data da exportação";
  const { from, to } = effectivePeriod(filters);
  const dateLabel = filters.kind === "atraso" ? "Prazo" : "Pedido";
  const parts = [`Situação: ${statusLabel(filters.kind, filters.status)}`];
  if (from || to) {
    const range = [from && `de ${isoToBr(from)}`, to && `até ${isoToBr(to)}`].filter(Boolean).join(" ");
    parts.push(`${dateLabel} ${range}`);
  } else {
    parts.push("Todo o período");
  }
  return parts.join(" · ");
}

function isoToBr(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// ---- Indicadores (os totais gerais de cada relatório) ----

export function overdueIndicators(total: number, totalFineCents: number): ReportIndicator[] {
  return [
    { label: "Empréstimos em atraso", value: formatNumber(total), tone: total > 0 ? "danger" : "default" },
    { label: "Multa estimada", value: formatReais(totalFineCents), tone: totalFineCents > 0 ? "danger" : "default" },
  ];
}

export interface InventoryTotals {
  titles: number;
  copies: number;
  borrowed: number;
  held: number;
  available: number;
  inactiveCopies: number;
}

export function inventoryIndicators(totals: InventoryTotals): ReportIndicator[] {
  return [
    { label: "Títulos ativos", value: formatNumber(totals.titles) },
    { label: "Exemplares", value: formatNumber(totals.copies) },
    { label: "Disponíveis", value: formatNumber(totals.available) },
    { label: "Emprestados", value: formatNumber(totals.borrowed) },
    { label: "Reservados", value: formatNumber(totals.held) },
    { label: "Inativos", value: formatNumber(totals.inactiveCopies) },
  ];
}

export function pedagogicalIndicators(counts: Partial<Record<Exclude<PedagogicalStatus, "all">, number>>): ReportIndicator[] {
  const count = (status: Exclude<PedagogicalStatus, "all">) => counts[status] ?? 0;
  const requests = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return [
    { label: "Solicitações", value: formatNumber(requests) },
    { label: "Aprovadas", value: formatNumber(count("approved")) },
    { label: "Recusadas", value: formatNumber(count("rejected")) },
    { label: "Aguardando", value: formatNumber(count("pending")) },
  ];
}

// "Dom Casmurro, Iracema e mais 2" (a tabela mostra poucos títulos e o total).
export function bookListText(titles: string[], total: number, shown = 3): string {
  if (total === 0) return "—";
  const visible = titles.slice(0, shown);
  const rest = total - visible.length;
  return rest > 0 ? `${visible.join(", ")} e mais ${rest}` : visible.join(", ");
}
