import { calculateDaysLate, calculateFine, formatLoanDate, formatReais, localDay } from "../loans/loan-rules";
import type { DeadlineNoticeView, DeadlineStatus, NoticeFilter, PanelSummary, PendingItem, PendingPedagogicalView } from "@/types/panel";

// Regras do painel da bibliotecária (RF-24, RF-30 a RF-32; Figma, cards 0157 e 0147).

// "A vencer" são os empréstimos que vencem em até 2 dias depois de hoje (Figma: "A vencer (até 2 dias)").
export const DUE_SOON_DAYS = 2;
// Teto de avisos buscados por tela (regra do plano gratuito: toda consulta tem limite explícito).
export const NOTICE_LIMIT = 100;
// Quantas linhas a lista "Pendências de hoje" mostra; o resto fica na tela de avisos.
export const PENDING_LIMIT = 8;

export const PANEL_PATH = "/funcionario/painel";
export const NOTICES_PATH = "/funcionario/painel/avisos";
// Fila de aprovação das reservas pedagógicas (tela da frente das reservas, card 0080).
export const PEDAGOGICAL_QUEUE_PATH = "/funcionario/reservas-pedagogicas";

const DAY_MS = 24 * 60 * 60 * 1000;
// O Brasil não tem horário de verão desde 2019: Brasília é sempre UTC−3 (mesma premissa de calculateDueDate).
const BRASILIA_OFFSET = "-03:00";

// ---- Situação do prazo ----

// Atrasado = o prazo foi em um dia anterior a hoje (é quando a multa começa: devolver no dia do prazo, a qualquer hora, não
// é atraso). Hoje = o prazo é hoje. A vencer = nos próximos dias da janela. Mais longe que isso não é aviso (null).
export function deadlineStatus(dueAt: Date, now: Date, soonDays = DUE_SOON_DAYS): DeadlineStatus | null {
  if (calculateDaysLate(dueAt, now) > 0) return "overdue";
  const daysLeft = daysUntilDue(dueAt, now);
  if (daysLeft === 0) return "today";
  return daysLeft <= soonDays ? "soon" : null;
}

// Dias de calendário (Brasília) entre hoje e o prazo; 0 para prazo de hoje ou já vencido.
// Reaproveita a conta da multa com os papéis trocados: "dias de atraso" de um prazo que é hoje, devolvido no dia do prazo.
export function daysUntilDue(dueAt: Date, now: Date): number {
  return calculateDaysLate(now, dueAt);
}

// Limites de cada situação como instantes (ISO), para o banco filtrar: [início de hoje, início de amanhã, fim da janela).
// Atrasado: due_at < hoje. Hoje: hoje <= due_at < amanhã. A vencer: amanhã <= due_at < fim da janela.
export function deadlineBounds(now: Date, soonDays = DUE_SOON_DAYS): { todayStart: string; tomorrowStart: string; windowEnd: string } {
  const today = localDay(now);
  const startOf = (offsetDays: number) =>
    new Date(`${new Date(Date.parse(today) + offsetDays * DAY_MS).toISOString().slice(0, 10)}T00:00:00${BRASILIA_OFFSET}`).toISOString();
  return { todayStart: startOf(0), tomorrowStart: startOf(1), windowEnd: startOf(soonDays + 1) };
}

// ---- Textos ----

export const DEADLINE_LABELS: Record<DeadlineStatus, string> = { soon: "A vencer", today: "Hoje", overdue: "Atrasado" };
// Títulos dos grupos da lista (Figma: "A vencer (até 2 dias)", "Vence hoje", "Atrasado").
export const DEADLINE_GROUP_TITLES: Record<DeadlineStatus, string> = {
  soon: `A vencer (até ${DUE_SOON_DAYS} dias)`,
  today: "Vence hoje",
  overdue: "Atrasado",
};

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

// "Faltam 2 dias", "Falta 1 dia", "Vence hoje" ou "4 dias de atraso".
export function whenLabel(status: DeadlineStatus, days: number): string {
  if (status === "today") return "Vence hoje";
  if (status === "overdue") return `${plural(days, "dia", "dias")} de atraso`;
  return days === 1 ? "Falta 1 dia" : `Faltam ${days} dias`;
}

// ---- Avisos ----

// Uma linha do banco: empréstimo em aberto com o nome do usuário e o título do livro.
export interface NoticeRow {
  id: string;
  due_at: string;
  profiles: { full_name: string } | null;
  books: { title: string; code: string } | null;
}

// Monta o aviso da tela. "now" entra de fora para o cálculo ser testável. Linha fora da janela (prazo longe) vira null.
export function toNoticeView(row: NoticeRow, now: Date, soonDays = DUE_SOON_DAYS): DeadlineNoticeView | null {
  const dueAt = new Date(row.due_at);
  const status = deadlineStatus(dueAt, now, soonDays);
  if (!status) return null;
  const { daysLate, amountCents } = calculateFine(dueAt, now);
  return {
    id: row.id,
    status,
    userName: row.profiles?.full_name ?? "Usuário removido",
    bookTitle: row.books?.title ?? "Livro removido",
    code: row.books?.code ?? "—",
    dueOn: formatLoanDate(dueAt),
    whenLabel: whenLabel(status, status === "overdue" ? daysLate : daysUntilDue(dueAt, now)),
    fineLabel: `Multa: ${formatReais(amountCents)}`,
    daysLate,
    fineCents: amountCents,
  };
}

// Separa os avisos nos três grupos da tela, mantendo a ordem de chegada (mais urgente primeiro).
export function groupNotices(notices: DeadlineNoticeView[]): Record<DeadlineStatus, DeadlineNoticeView[]> {
  const groups: Record<DeadlineStatus, DeadlineNoticeView[]> = { soon: [], today: [], overdue: [] };
  for (const notice of notices) groups[notice.status].push(notice);
  return groups;
}

// ---- Endereços ----

export const NOTICE_FILTER_LABELS: Record<NoticeFilter, string> = {
  all: "Todos",
  soon: "A vencer",
  today: "Hoje",
  overdue: "Atrasados",
};

const FILTER_PARAMS: Record<NoticeFilter, string> = { all: "", soon: "a-vencer", today: "hoje", overdue: "atrasados" };

// Filtro lido do endereço (?filtro=). Qualquer outro valor vira "todos".
export function parseNoticeFilter(value: string | string[] | undefined): NoticeFilter {
  const found = (Object.keys(FILTER_PARAMS) as NoticeFilter[]).find((key) => key !== "all" && FILTER_PARAMS[key] === value);
  return found ?? "all";
}

export function noticeHref(filter: NoticeFilter = "all"): string {
  return filter === "all" ? NOTICES_PATH : `${NOTICES_PATH}?filtro=${FILTER_PARAMS[filter]}`;
}

// "Ver empréstimo": abre a aba de devolução já buscando pelo tombo do livro (único no acervo).
export function loanHref(code: string): string {
  return `/funcionario/emprestimos?aba=devolucao&q=${encodeURIComponent(code)}`;
}

// ---- Faixa de avisos do painel ----

// Frase da faixa: "Atenção: 3 empréstimos vencem em até 2 dias e 9 estão atrasados." Sem nada a avisar, devolve null.
// "vencem em até 2 dias" soma os que vencem hoje e os dos próximos dias.
export function bannerSentence(summary: Pick<PanelSummary, "dueToday" | "dueSoon" | "overdue">, soonDays = DUE_SOON_DAYS): string | null {
  const upcoming = summary.dueToday + summary.dueSoon;
  const parts: string[] = [];
  if (upcoming > 0) parts.push(`${plural(upcoming, "empréstimo vence", "empréstimos vencem")} em até ${soonDays} dias`);
  if (summary.overdue > 0) {
    parts.push(`${summary.overdue} ${summary.overdue === 1 ? "está atrasado" : "estão atrasados"}`);
  }
  return parts.length === 0 ? null : `Atenção: ${parts.join(" e ")}.`;
}

// ---- Pendências de hoje ----

// Monta a lista: reservas pedagógicas aguardando aprovação, devoluções de hoje e atrasados (os mais atrasados primeiro).
export function buildPendingItems(pedagogical: PendingPedagogicalView[], notices: DeadlineNoticeView[], limit = PENDING_LIMIT): PendingItem[] {
  const items: PendingItem[] = pedagogical.map((reservation) => ({
    key: `pedagogical-${reservation.id}`,
    title: "Reserva pedagógica aguardando aprovação",
    detail: `Prof. ${reservation.teacherName}${reservation.bookTitles.length > 0 ? ` · ${reservation.bookTitles.join(", ")}` : ""}`,
    badge: "Aguardando",
    tone: "warning",
    actionLabel: "Ver fila",
    href: PEDAGOGICAL_QUEUE_PATH,
  }));

  const groups = groupNotices(notices);
  for (const notice of groups.today) {
    items.push({
      key: `today-${notice.id}`,
      title: "Devolução de hoje",
      detail: `${notice.userName} · ${notice.bookTitle}`,
      badge: DEADLINE_LABELS.today,
      tone: "info",
      actionLabel: "Ver empréstimo",
      href: loanHref(notice.code),
    });
  }
  for (const notice of groups.overdue) {
    items.push({
      key: `overdue-${notice.id}`,
      title: `Atrasado há ${plural(notice.daysLate, "dia", "dias")}`,
      detail: `${notice.userName} · ${notice.bookTitle} · multa de ${formatReais(notice.fineCents)}`,
      badge: DEADLINE_LABELS.overdue,
      tone: "danger",
      actionLabel: "Ver empréstimo",
      href: loanHref(notice.code),
    });
  }
  return items.slice(0, limit);
}

// ---- Atalhos de operação (Figma, card 0157) ----

// O primeiro é o único botão primário da área. Cada atalho leva a uma tela que já existe.
export const PANEL_SHORTCUTS = [
  { label: "Novo empréstimo", href: "/funcionario/emprestimos" },
  { label: "Registrar devolução", href: "/funcionario/emprestimos?aba=devolucao" },
  { label: "Cadastrar livro", href: "/funcionario/acervo/novo" },
  { label: "Cadastrar usuário", href: "/funcionario/usuarios/novo" },
] as const;
