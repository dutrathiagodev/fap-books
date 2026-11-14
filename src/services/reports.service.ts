import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { formatIsoDate } from "@/domain/history/history-rules";
import {
  effectivePeriod,
  inventoryIndicators,
  overdueIndicators,
  pedagogicalIndicators,
  REPORT_EXPORT_LIMIT,
  REPORT_PAGE_SIZE,
} from "@/domain/reports/report-rules";
import type {
  InventoryReport,
  OverdueReport,
  PedagogicalReport,
  PedagogicalStatus,
  ReportFilters,
  ReportIndicator,
} from "@/types/report";

// Linhas pedidas ao banco: uma página da tela (pageSize 10) ou a exportação inteira (até o teto).
export interface ReportWindow {
  limit: number;
  offset: number;
}

export function pageWindow(page: number): ReportWindow {
  return { limit: REPORT_PAGE_SIZE, offset: (page - 1) * REPORT_PAGE_SIZE };
}

export const EXPORT_WINDOW: ReportWindow = { limit: REPORT_EXPORT_LIMIT, offset: 0 };

// Os relatórios são funções do banco (report_*): só a bibliotecária executa, cada uma limita o resultado e devolve o total do
// filtro inteiro em cada linha. Nenhum erro do banco vai para a tela; o log leva só o código (nunca nome nem matrícula).
function fail(error: { code?: string }): never {
  console.error("Falha ao consultar o relatório:", error.code ?? "desconhecido");
  throw new Error("Não foi possível gerar o relatório.");
}

// Linhas como as funções do banco devolvem (bigint chega como número ou texto, por isso o Number()).
interface OverdueDbRow {
  loan_id: string;
  user_name: string;
  registration: string | null;
  book_title: string;
  book_code: string;
  due_on: string;
  returned_on: string | null;
  days_late: number;
  fine_cents: number;
  total_count: number | string;
  total_fine_cents: number | string;
}

interface InventoryDbRow {
  category: string;
  titles: number;
  copies: number | string;
  borrowed: number | string;
  held: number | string;
  available: number | string;
  inactive_titles: number;
  inactive_copies: number | string;
  total_count: number | string;
  sum_titles: number | string;
  sum_copies: number | string;
  sum_borrowed: number | string;
  sum_held: number | string;
  sum_available: number | string;
  sum_inactive_copies: number | string;
}

interface PedagogicalDbRow {
  reservation_id: string;
  teacher_name: string;
  status: string;
  requested_on: string;
  start_date: string;
  days: number;
  purpose: string | null;
  book_count: number;
  book_titles: string[];
  total_count: number | string;
}

function toPage<Row>(rows: Row[], total: number, window: ReportWindow, indicators: ReportIndicator[]) {
  return { rows, total, page: Math.floor(window.offset / window.limit) + 1, pageSize: window.limit, indicators };
}

export async function getOverdueReport(filters: ReportFilters, window: ReportWindow): Promise<OverdueReport> {
  const supabase = await createSupabaseServerClient();
  const { from, to } = effectivePeriod(filters);
  const { data, error } = await supabase
    .rpc("report_overdue", { p_from: from, p_to: to, p_status: filters.status, p_limit: window.limit, p_offset: window.offset })
    .limit(window.limit);
  if (error) fail(error);

  const list = (data ?? []) as OverdueDbRow[];
  const first = list[0];
  const total = Number(first?.total_count ?? 0);
  const rows = list.map((row) => ({
    id: row.loan_id,
    userName: row.user_name,
    registration: row.registration ?? "—",
    bookTitle: row.book_title,
    code: row.book_code,
    dueOn: formatIsoDate(row.due_on),
    returnedOn: row.returned_on ? formatIsoDate(row.returned_on) : null,
    daysLate: row.days_late,
    fineCents: row.fine_cents,
  }));
  return toPage(rows, total, window, overdueIndicators(total, Number(first?.total_fine_cents ?? 0)));
}

export async function getInventoryReport(window: ReportWindow): Promise<InventoryReport> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("report_inventory", { p_limit: window.limit, p_offset: window.offset })
    .limit(window.limit);
  if (error) fail(error);

  const list = (data ?? []) as InventoryDbRow[];
  const first = list[0];
  const rows = list.map((row) => ({
    category: row.category,
    titles: row.titles,
    copies: Number(row.copies),
    borrowed: Number(row.borrowed),
    held: Number(row.held),
    available: Number(row.available),
    inactiveTitles: row.inactive_titles,
    inactiveCopies: Number(row.inactive_copies),
  }));
  const indicators = inventoryIndicators({
    titles: Number(first?.sum_titles ?? 0),
    copies: Number(first?.sum_copies ?? 0),
    borrowed: Number(first?.sum_borrowed ?? 0),
    held: Number(first?.sum_held ?? 0),
    available: Number(first?.sum_available ?? 0),
    inactiveCopies: Number(first?.sum_inactive_copies ?? 0),
  });
  return toPage(rows, Number(first?.total_count ?? 0), window, indicators);
}

export async function getPedagogicalReport(filters: ReportFilters, window: ReportWindow): Promise<PedagogicalReport> {
  const supabase = await createSupabaseServerClient();
  const { from, to } = effectivePeriod(filters);
  const [list, counts] = await Promise.all([
    supabase
      .rpc("report_pedagogical", { p_from: from, p_to: to, p_status: filters.status, p_limit: window.limit, p_offset: window.offset })
      .limit(window.limit),
    supabase.rpc("report_pedagogical_counts", { p_from: from, p_to: to }).limit(10),
  ]);
  if (list.error) fail(list.error);
  if (counts.error) fail(counts.error);

  const byStatus: Partial<Record<Exclude<PedagogicalStatus, "all">, number>> = {};
  for (const row of (counts.data ?? []) as { status: string; total: number | string }[]) byStatus[row.status as Exclude<PedagogicalStatus, "all">] = Number(row.total);

  const found = (list.data ?? []) as PedagogicalDbRow[];
  const rows = found.map((row) => ({
    id: row.reservation_id,
    teacherName: row.teacher_name,
    status: row.status as Exclude<PedagogicalStatus, "all">,
    requestedOn: formatIsoDate(row.requested_on),
    startOn: formatIsoDate(row.start_date),
    days: row.days,
    purpose: row.purpose,
    bookCount: row.book_count,
    bookTitles: row.book_titles,
  }));
  return toPage(rows, Number(found[0]?.total_count ?? 0), window, pedagogicalIndicators(byStatus));
}
