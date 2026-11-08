import { isUuid } from "../books/book-rules";
import { initialsOf, parseLookupTerm } from "../loans/loan-lookup-rules";
import type {
  HistoryFilters,
  HistoryRowView,
  HistoryStatus,
  HistoryStatusFilter,
  HistoryTab,
} from "@/types/loan-history";

export const HISTORY_PATH = "/funcionario/historico";
export const HISTORY_PAGE_SIZE = 10;
// Teto da página pedida no endereço: ninguém navega tanto, e o número alto só serviria para forçar consultas vazias.
const MAX_PAGE = 10_000;

// A biblioteca fica em Curitiba: datas e dias de atraso contam pelo calendário de Brasília (sem horário de verão desde 2019).
const TIME_ZONE = "America/Sao_Paulo";
const BRASILIA_OFFSET = "-03:00";
const DAY_MS = 24 * 60 * 60 * 1000;

export const STATUS_FILTERS: { value: HistoryStatusFilter; label: string }[] = [
  { value: "all", label: "Todos os registros" },
  { value: "open", label: "Em aberto" },
  { value: "returned", label: "Devolvidos" },
  { value: "overdue", label: "Em atraso" },
  { value: "fined", label: "Com multa" },
  { value: "fine_open", label: "Multas em aberto" },
];

const STATUS_VALUES = new Set<string>(STATUS_FILTERS.map((item) => item.value));

function firstOf(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : (value?.[0] ?? "");
}

// "2026-02-30" passa no formato mas não existe: confere indo e voltando pelo calendário.
export function parseIsoDate(raw: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw ? null : raw;
}

// Lê e valida o endereço: o que vier inválido volta ao padrão (nada de erro por causa de um parâmetro adulterado).
export function parseHistoryFilters(params: Record<string, string | string[] | undefined>): HistoryFilters {
  const tab: HistoryTab = firstOf(params.aba) === "livro" ? "livro" : "usuario";
  const term = parseLookupTerm(firstOf(params.q));
  const subject = firstOf(tab === "livro" ? params.l : params.u);
  const status = firstOf(params.status);
  const page = Number.parseInt(firstOf(params.pagina), 10);
  return {
    tab,
    query: term.ok ? term.term : "",
    subjectId: isUuid(subject) ? subject : null,
    from: parseIsoDate(firstOf(params.de)),
    to: parseIsoDate(firstOf(params.ate)),
    status: STATUS_VALUES.has(status) ? (status as HistoryStatusFilter) : "all",
    page: Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1,
  };
}

// Período com as datas trocadas não faz sentido: a tela avisa e consulta sem período.
export function periodError(filters: Pick<HistoryFilters, "from" | "to">): string | null {
  return filters.from && filters.to && filters.from > filters.to ? "A data inicial não pode ser depois da data final." : null;
}

// Início (inclusive) e fim (exclusivo) do período como instantes, em horário de Brasília. Período inválido não filtra.
export function periodBounds(filters: Pick<HistoryFilters, "from" | "to">): { start: string | null; end: string | null } {
  if (periodError(filters)) return { start: null, end: null };
  const start = filters.from ? `${filters.from}T00:00:00${BRASILIA_OFFSET}` : null;
  const end = filters.to ? `${nextDay(filters.to)}T00:00:00${BRASILIA_OFFSET}` : null;
  return { start, end };
}

function nextDay(isoDate: string): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
}

// "01/02/2026" a partir de "2026-02-01" (o texto dos chips do período).
export function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// "27/10/2026": o dia em Brasília em que o instante cai.
export function formatHistoryDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function localDay(date: Date): number {
  return Date.parse(new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date));
}

// Dias de atraso: devolver no dia do prazo (a qualquer hora) não é atraso; o dia seguinte já é 1 dia (mesma regra da multa).
export function daysLateBetween(dueAt: Date, endAt: Date): number {
  return Math.max(0, Math.round((localDay(endAt) - localDay(dueAt)) / DAY_MS));
}

// "R$ 8,00" a partir de centavos.
export function formatCents(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const STATUS_LABELS: Record<HistoryStatus, string> = {
  open: "Em aberto",
  overdue: "Em atraso",
  returned: "Devolvido",
  returned_late: "Devolvido com atraso",
};

// Uma linha do banco: empréstimo com a pessoa, o livro e a multa (se houver).
export interface HistoryRow {
  id: string;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  renewals: number;
  profiles: { full_name: string; registration: string | null } | null;
  books: { title: string; code: string } | null;
  // Uma multa por empréstimo (loan_id é único); o PostgREST entrega objeto, mas aceitamos lista por segurança.
  fines: FineRow | FineRow[] | null;
}

interface FineRow {
  amount_cents: number;
  days_late: number;
  paid_at: string | null;
}

// Situação da linha. "now" entra de fora para o cálculo ser testável.
export function historyStatus(dueAt: Date, returnedAt: Date | null, hasFine: boolean, now: Date): HistoryStatus {
  if (!returnedAt) return dueAt.getTime() < now.getTime() ? "overdue" : "open";
  return hasFine || daysLateBetween(dueAt, returnedAt) > 0 ? "returned_late" : "returned";
}

export function toHistoryRowView(row: HistoryRow, now: Date): HistoryRowView {
  const dueAt = new Date(row.due_at);
  const returnedAt = row.returned_at ? new Date(row.returned_at) : null;
  const fine = Array.isArray(row.fines) ? (row.fines[0] ?? null) : row.fines;
  const status = historyStatus(dueAt, returnedAt, Boolean(fine), now);
  const name = row.profiles?.full_name ?? "Usuário removido";
  const daysLate = fine?.days_late ?? daysLateBetween(dueAt, returnedAt ?? now);

  return {
    id: row.id,
    userName: name,
    initials: initialsOf(name),
    registration: row.profiles?.registration ?? "—",
    bookTitle: row.books?.title ?? "Livro removido",
    code: row.books?.code ?? "—",
    borrowedOn: formatHistoryDate(new Date(row.borrowed_at)),
    dueOn: formatHistoryDate(dueAt),
    returnedOn: returnedAt ? formatHistoryDate(returnedAt) : null,
    renewals: row.renewals,
    status,
    statusLabel: STATUS_LABELS[status],
    daysLate,
    fineLabel: fine ? formatCents(fine.amount_cents) : "Sem multa",
    fineNote: fine ? (fine.paid_at ? "Paga" : "Em aberto") : null,
  };
}

// Endereço da tela com os filtros: só entra o que foge do padrão, e trocar de aba, busca ou filtro volta à página 1.
export function historyHref(filters: HistoryFilters, change: Partial<HistoryFilters> = {}): string {
  const next = { ...filters, ...change };
  const params = new URLSearchParams();
  if (next.tab === "livro") params.set("aba", "livro");
  if (next.query) params.set("q", next.query);
  if (next.subjectId) params.set(next.tab === "livro" ? "l" : "u", next.subjectId);
  if (next.from) params.set("de", next.from);
  if (next.to) params.set("ate", next.to);
  if (next.status !== "all") params.set("status", next.status);
  if (next.page > 1) params.set("pagina", String(next.page));
  const query = params.toString();
  return query ? `${HISTORY_PATH}?${query}` : HISTORY_PATH;
}

// "Mostrando 1-10 de 143 empréstimos".
export function historySummary(page: number, pageSize: number, shown: number, total: number): string {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  return `Mostrando ${first}-${first + shown - 1} de ${total} ${total === 1 ? "empréstimo" : "empréstimos"}`;
}
