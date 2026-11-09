import { formatNumber } from "../format";
import type { FineFilter, FineFilters } from "../../types/fine";

export const FINES_PATH = "/funcionario/multas";

// Regra oficial (PRD, RF-22): R$ 1,00 por dia de atraso, em centavos. É a mesma do banco (fine_cents_per_day).
export const FINE_PER_DAY_CENTS = 100;

// A biblioteca fica em Curitiba: os dias de atraso e as datas na tela contam pelo calendário de Brasília.
const TIME_ZONE = "America/Sao_Paulo";
const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-10-27": o dia do calendário de Brasília em que o instante cai.
function localDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

// Dias de atraso = dias corridos entre o dia do prazo e o dia da devolução (ou de hoje, se ainda não devolveu).
// Devolver no dia do prazo, a qualquer hora, não é atraso; o dia seguinte já é 1 dia. Não há desconto por feriado,
// recesso ou fim de semana: todo dia do calendário conta (decisão registrada em docs/arquitetura.md, seção "Regras de negócio").
export function calculateDaysLate(dueAt: Date, returnedAt: Date): number {
  const diff = (Date.parse(localDay(returnedAt)) - Date.parse(localDay(dueAt))) / DAY_MS;
  return Math.max(0, Math.round(diff));
}

// Multa por atraso: dias de atraso vezes R$ 1,00. Sem atraso, sem multa. O banco confere o mesmo valor (return_loan).
export function calculateFine(dueAt: Date, returnedAt: Date): { daysLate: number; amountCents: number } {
  const daysLate = calculateDaysLate(dueAt, returnedAt);
  return { daysLate, amountCents: daysLate * FINE_PER_DAY_CENTS };
}

// "R$ 8,00" a partir de centavos.
export function formatReais(cents: number): string {
  return `R$ ${formatNumber(cents / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// "1 dia" ou "4 dias".
export function formatDays(days: number): string {
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}

// "27/10/2026" (calendário de Brasília).
export function formatFineDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

// "27/10/2026, 10:42" (Brasília).
export function formatFineDateTime(date: Date): string {
  const time = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  return `${formatFineDate(date)}, ${time}`;
}

// Frase que a bibliotecária confirma no modal da baixa (Figma 6564-2275).
export function receivedText(amountCents: number): string {
  return `Recebi ${formatReais(amountCents)} presencialmente`;
}

// ---- Filtros do endereço (?status=, ?q= e ?pagina=) ----

const FILTERS: readonly FineFilter[] = ["all", "open", "paid"];
const MAX_QUERY_LENGTH = 60;
const MAX_PAGE = 10000;

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// Texto da busca: sem caracteres de controle e "*" (o PostgREST troca "*" por "%"), espaços juntos, no máximo 60 letras.
export function cleanFineQuery(raw: string): string {
  return raw.replace(/[\p{C}*]/gu, " ").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH).trim();
}

// Tudo o que vem do endereço é dado do navegador: valor desconhecido cai no padrão (Em aberto, sem busca, página 1).
export function parseFineFilters(params: RawParams): FineFilters {
  const status = first(params.status);
  const page = Number.parseInt(first(params.pagina), 10);
  return {
    filter: (FILTERS as readonly string[]).includes(status) ? (status as FineFilter) : "open",
    query: cleanFineQuery(first(params.q)),
    page: Number.isInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1,
  };
}

// Endereço da tela com os filtros. O padrão (Em aberto) não aparece no endereço.
export function fineHref(filters: Partial<FineFilters>): string {
  const search = new URLSearchParams();
  if (filters.query) search.set("q", filters.query);
  if (filters.filter && filters.filter !== "open") search.set("status", filters.filter);
  if (filters.page && filters.page > 1) search.set("pagina", String(filters.page));
  const text = search.toString();
  return text ? `${FINES_PATH}?${text}` : FINES_PATH;
}

export const FILTER_LABELS: Record<FineFilter, string> = { all: "Todas", open: "Em aberto", paid: "Pagas" };

// "Mostrando 1-4 de 18 multas · Total em aberto no balcão: R$ 24,00"
export function fineSummary(first: number, last: number, total: number, openCents: number): string {
  const range = total === 0 ? "Nenhuma multa" : `Mostrando ${first}-${last} de ${total} ${total === 1 ? "multa" : "multas"}`;
  return `${range} · Total em aberto no balcão: ${formatReais(openCents)}`;
}
