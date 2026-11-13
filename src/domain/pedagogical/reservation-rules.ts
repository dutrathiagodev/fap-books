import { plural } from "../format";
import type { QueueFilter, QueueFilters, ReservationStatus } from "../../types/pedagogical-reservation";

export const TEACHER_RESERVATION_PATH = "/professor/reserva-pedagogica";
export const QUEUE_PATH = "/funcionario/reservas-pedagogicas";
export const NEW_IN_PERSON_PATH = "/funcionario/reservas-pedagogicas/nova";

// Limites do pedido (PRD, RF-18). São os mesmos do banco (pedagogical_max_days e pedagogical_max_books); aqui servem
// para avisar antes de enviar e para validar no servidor, mas quem decide é o banco.
export const MIN_DAYS = 1;
// 30 é o padrão (decisão do dono, 27/10); a funcionária pode alterar (card 0218) e o valor do dia vem do banco.
export const DEFAULT_MAX_DAYS = 30;
export const MAX_DAYS = DEFAULT_MAX_DAYS;
export const MAX_DAYS_CEILING = 365;
export const MAX_BOOKS = 10;
export const MAX_PURPOSE_LENGTH = 120;
export const MAX_NOTE_LENGTH = 500;
const MAX_DAYS_AHEAD = 365;

const TIME_ZONE = "America/Sao_Paulo";
const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---- Datas (sempre texto "aaaa-mm-dd", o dia do calendário de Brasília; nada de fuso no meio) ----

// "2026-11-08": o dia de hoje em Brasília.
export function todayInBrasilia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

// Texto "aaaa-mm-dd" que é uma data de verdade (rejeita 2026-02-31).
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

// "2026-11-08" -> "08/11/2026".
export function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// Instante (timestamp do banco) -> "08/11/2026" no calendário de Brasília.
export function formatInstantDate(value: string | Date): string {
  return formatIsoDate(todayInBrasilia(typeof value === "string" ? new Date(value) : value));
}

// "30 dias" ou "1 dia".
export function formatDays(days: number): string {
  return `${days} ${plural(days, "dia", "dias")}`;
}

// "10/11/2026 a 10/12/2026 · 30 dias" (a devolução é no dia do fim do período).
export function formatPeriod(startIso: string, days: number): string {
  return `${formatIsoDate(startIso)} a ${formatIsoDate(addDays(startIso, days))} · ${formatDays(days)}`;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

// ---- Formulário (professor e balcão) ----

export interface ReservationInput {
  bookIds: unknown;
  startDate: unknown;
  days: unknown;
  purpose: unknown;
}

export interface ReservationValues {
  bookIds: string[];
  startDate: string;
  days: number;
  purpose: string | null;
}

export type ReservationFieldErrors = Partial<Record<"books" | "startDate" | "days" | "purpose", string>>;

export type ReservationParse = { ok: true; values: ReservationValues } | { ok: false; errors: ReservationFieldErrors };

// Mensagens de cada campo (as mesmas da tela e da resposta do servidor).
export const FIELD_MESSAGES = {
  booksRequired: "Escolha pelo menos um livro.",
  booksTooMany: `Escolha no máximo ${MAX_BOOKS} livros por solicitação.`,
  booksInvalid: "Livro inválido. Escolha de novo.",
  startRequired: "Informe a data de início do uso.",
  startPast: "A data de início não pode ser no passado.",
  startTooFar: "A data de início deve ser dentro de um ano.",
  daysInvalid: `Informe o prazo em dias, de ${MIN_DAYS} a ${MAX_DAYS}.`,
  daysTooMany: `O prazo máximo é de ${MAX_DAYS} dias.`,
  purposeTooLong: `A disciplina deve ter no máximo ${MAX_PURPOSE_LENGTH} caracteres.`,
} as const;

// As mesmas frases com o limite do dia (configurável pela funcionária).
export const daysInvalidMessage = (maxDays: number) => `Informe o prazo em dias, de ${MIN_DAYS} a ${maxDays}.`;
export const daysTooManyMessage = (maxDays: number) => `O prazo máximo é de ${maxDays} dias.`;

// Mesma frase na tela, no servidor e no erro do banco (card 0254): a funcionária nunca vê a validação nativa do navegador.
export const MAX_DAYS_RANGE_MESSAGE = `Informe de 1 a ${MAX_DAYS_CEILING} dias.`;

// Limite de dias que a funcionária digita: inteiro de 1 a 365 (o banco confere de novo).
export function parseMaxDaysInput(raw: unknown): { ok: true; days: number } | { ok: false; message: string } {
  const text = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : "";
  if (!/^\d{1,3}$/.test(text)) return { ok: false, message: MAX_DAYS_RANGE_MESSAGE };
  const days = Number(text);
  if (days < 1 || days > MAX_DAYS_CEILING) return { ok: false, message: MAX_DAYS_RANGE_MESSAGE };
  return { ok: true, days };
}

// Texto livre do navegador: sem caracteres de controle, espaços juntos.
export function cleanText(raw: unknown, maxLength: number): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\p{C}/gu, " ").replace(/\s+/g, " ").trim().slice(0, maxLength + 1);
}

// Confere e limpa o pedido. Roda na tela (para avisar logo) e no servidor (que não confia no navegador).
export function parseReservationInput(input: ReservationInput, today: string = todayInBrasilia(), maxDays: number = DEFAULT_MAX_DAYS): ReservationParse {
  const errors: ReservationFieldErrors = {};

  const rawIds = Array.isArray(input.bookIds) ? input.bookIds : [];
  const bookIds = rawIds.filter((id): id is string => isUuid(id));
  if (rawIds.length === 0) errors.books = FIELD_MESSAGES.booksRequired;
  else if (bookIds.length !== rawIds.length || new Set(bookIds).size !== bookIds.length) errors.books = FIELD_MESSAGES.booksInvalid;
  else if (bookIds.length > MAX_BOOKS) errors.books = FIELD_MESSAGES.booksTooMany;

  const startDate = typeof input.startDate === "string" ? input.startDate.trim() : "";
  if (!startDate || !isIsoDate(startDate)) errors.startDate = FIELD_MESSAGES.startRequired;
  else if (startDate < today) errors.startDate = FIELD_MESSAGES.startPast;
  else if (startDate > addDays(today, MAX_DAYS_AHEAD)) errors.startDate = FIELD_MESSAGES.startTooFar;

  const days = typeof input.days === "number" ? input.days : typeof input.days === "string" && /^\d{1,4}$/.test(input.days.trim()) ? Number(input.days) : NaN;
  if (!Number.isInteger(days) || days < MIN_DAYS) errors.days = daysInvalidMessage(maxDays);
  else if (days > maxDays) errors.days = daysTooManyMessage(maxDays);

  const purpose = cleanText(input.purpose, MAX_PURPOSE_LENGTH);
  if (purpose.length > MAX_PURPOSE_LENGTH) errors.purpose = FIELD_MESSAGES.purposeTooLong;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, values: { bookIds, startDate, days, purpose: purpose || null } };
}

// Justificativa da decisão: obrigatória na recusa (RF-17), opcional na aprovação.
export function parseDecisionNote(raw: unknown, required: boolean): { ok: true; note: string | null } | { ok: false; message: string } {
  const note = cleanText(raw, MAX_NOTE_LENGTH);
  if (note.length > MAX_NOTE_LENGTH) return { ok: false, message: `A justificativa deve ter no máximo ${MAX_NOTE_LENGTH} caracteres.` };
  if (required && !note) return { ok: false, message: "Informe a justificativa da recusa." };
  return { ok: true, note: note || null };
}

// ---- Status ----

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Aguardando aprovação",
  approved: "Aprovada",
  rejected: "Recusada",
  returned: "Devolvida",
  cancelled: "Cancelada",
};

// ---- Fila (?status=, ?pagina= e ?ver=) ----

export const QUEUE_FILTERS: readonly QueueFilter[] = ["pending", "approved", "rejected", "returned"];
export const QUEUE_FILTER_LABELS: Record<QueueFilter, string> = {
  pending: "Pendentes",
  approved: "Aprovadas",
  rejected: "Recusadas",
  returned: "Devolvidas",
};
const MAX_PAGE = 10000;

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// Tudo o que vem do endereço é dado do navegador: valor desconhecido cai no padrão (Pendentes, página 1, sem detalhe).
export function parseQueueFilters(params: RawParams): QueueFilters {
  const status = first(params.status);
  const page = Number.parseInt(first(params.pagina), 10);
  const detail = first(params.ver);
  return {
    filter: (QUEUE_FILTERS as readonly string[]).includes(status) ? (status as QueueFilter) : "pending",
    page: Number.isInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1,
    detail: isUuid(detail) ? detail : null,
  };
}

// Endereço da fila com os filtros. O padrão (Pendentes) não aparece no endereço.
export function queueHref(filters: Partial<QueueFilters>): string {
  const search = new URLSearchParams();
  if (filters.filter && filters.filter !== "pending") search.set("status", filters.filter);
  if (filters.page && filters.page > 1) search.set("pagina", String(filters.page));
  if (filters.detail) search.set("ver", filters.detail);
  const text = search.toString();
  return text ? `${QUEUE_PATH}?${text}` : QUEUE_PATH;
}

// "Mostrando 1-10 de 23 solicitações"
export function queueSummary(first: number, last: number, total: number): string {
  if (total === 0) return "Nenhuma solicitação";
  return `Mostrando ${first}-${last} de ${total} ${plural(total, "solicitação", "solicitações")}`;
}

// "Metodologia Científica, Redes de Computadores e mais 1" (lista curta para a linha da fila).
export function bookTitlesSummary(titles: string[], max = 2): string {
  if (titles.length <= max) return new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" }).format(titles);
  const rest = titles.length - max;
  return `${titles.slice(0, max).join(", ")} e mais ${rest}`;
}
