import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  deadlineBounds,
  DUE_SOON_DAYS,
  NOTICE_LIMIT,
  toNoticeView,
  type NoticeRow,
} from "@/domain/panel/panel-rules";
import type { DeadlineNoticeView, NoticeFilter, PanelSummary, PendingPedagogicalView } from "@/types/panel";

// Quantas reservas pedagógicas pendentes aparecem na lista do painel (o total vem do contador).
const PEDAGOGICAL_LIMIT = 3;

// Contadores do dia: a função panel_summary() conta tudo no banco (só a bibliotecária executa; o banco confere de novo).
export async function getPanelSummary(): Promise<PanelSummary> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("panel_summary", { p_soon_days: DUE_SOON_DAYS });
  // Só um código vai para o log (nunca dado de pessoa).
  if (error || !data || data.length === 0) {
    console.error("Falha ao ler o resumo do painel:", error?.code ?? "sem_dados");
    throw new Error("Não foi possível carregar o painel.");
  }
  const row = data[0];
  return {
    borrowed: row.borrowed,
    overdue: row.overdue,
    dueToday: row.due_today,
    dueSoon: row.due_soon,
    availableCopies: Number(row.available_copies),
    openFines: row.open_fines,
    openFinesCents: Number(row.open_fines_cents),
    pendingPedagogical: row.pending_pedagogical,
  };
}

// Avisos de prazo: empréstimos em aberto que vencem em breve, vencem hoje ou já venceram, o mais urgente primeiro.
// O filtro vai para o banco (faixa de datas), então "Atrasados" mostra os atrasos mesmo que sejam mais que o limite.
export async function listDeadlineNotices(filter: NoticeFilter = "all", now = new Date()): Promise<DeadlineNoticeView[]> {
  const { todayStart, tomorrowStart, windowEnd } = deadlineBounds(now);
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("loans")
    .select("id, due_at, profiles!loans_user_id_fkey(full_name, phone), books(title, code)")
    .is("returned_at", null)
    .order("due_at", { ascending: true })
    .limit(NOTICE_LIMIT);

  if (filter === "overdue") query = query.lt("due_at", todayStart);
  else if (filter === "today") query = query.gte("due_at", todayStart).lt("due_at", tomorrowStart);
  else if (filter === "soon") query = query.gte("due_at", tomorrowStart).lt("due_at", windowEnd);
  else query = query.lt("due_at", windowEnd);

  const { data, error } = await query;
  if (error) {
    console.error("Falha ao ler os avisos de prazo:", error.code);
    throw new Error("Não foi possível carregar os avisos de prazo.");
  }
  return (data as unknown as NoticeRow[]).flatMap((row) => toNoticeView(row, now) ?? []);
}

// Reservas pedagógicas aguardando aprovação, as mais antigas primeiro. Só leitura: decidir é da fila (outra tela).
export async function listPendingPedagogical(): Promise<PendingPedagogicalView[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pedagogical_reservations")
    .select(
      "id, teacher:profiles!pedagogical_reservations_teacher_id_fkey(full_name), pedagogical_reservation_books(books(title))",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(PEDAGOGICAL_LIMIT);
  if (error) {
    console.error("Falha ao ler as reservas pedagógicas pendentes:", error.code);
    throw new Error("Não foi possível carregar as pendências.");
  }
  const rows = data as unknown as {
    id: string;
    teacher: { full_name: string } | null;
    pedagogical_reservation_books: { books: { title: string } | null }[];
  }[];
  return rows.map((row) => ({
    id: row.id,
    teacherName: row.teacher?.full_name ?? "Professor removido",
    bookTitles: row.pedagogical_reservation_books.flatMap((item) => (item.books ? [item.books.title] : [])),
  }));
}
