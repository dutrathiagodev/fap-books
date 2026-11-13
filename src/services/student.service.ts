import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { GENERIC_LOAN_ERROR, loanErrorCode, loanErrorMessage } from "@/domain/loans/loan-errors";
import { STUDENT_RENEW_BLOCK_MESSAGES } from "@/domain/student/student-rules";
import { formatLoanDate } from "@/domain/loans/loan-rules";
import {
  buildStudentSummary,
  sortLoansByUrgency,
  toMyFineView,
  toMyLoanView,
  toMyReservationView,
  type MyFineRow,
  type MyLoanRow,
  type MyReservationRow,
} from "@/domain/student/student-rules";
import type { LoanActionResult } from "@/types/loan";
import type { MyFineView, MyLoanView, MyReservationView, StudentSummary } from "@/types/student";

// Leituras da Área do aluno. Toda consulta filtra pelo id de quem está logado E tem limite; o RLS do banco garante o mesmo
// (o aluno só lê as linhas dele), então um id trocado não devolve dado de outra pessoa.
// Tetos folgados: o limite é 3 ou 4 livros em aberto; reservas e multas só mostram as mais recentes.
const OPEN_LOANS_LIMIT = 50;
const FINES_LIMIT = 100;
const RESERVATIONS_LIMIT = 50;

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// Soma das multas em aberto, em centavos.
async function openFineCents(supabase: Client, userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("fines")
    .select("amount_cents")
    .eq("user_id", userId)
    .is("paid_at", null)
    .limit(FINES_LIMIT);
  if (error) throw new Error("Não foi possível consultar as multas.");
  return data.reduce((sum, fine) => sum + fine.amount_cents, 0);
}

async function readOpenLoans(supabase: Client, userId: string, fineCents: number): Promise<MyLoanView[]> {
  const { data, error } = await supabase
    .from("loans")
    .select("id, borrowed_at, due_at, renewals, books(title, code)")
    .eq("user_id", userId)
    .is("returned_at", null)
    .order("due_at", { ascending: true })
    .limit(OPEN_LOANS_LIMIT);
  if (error) throw new Error("Não foi possível consultar os empréstimos.");
  const now = new Date();
  return (data as unknown as MyLoanRow[]).map((row) => toMyLoanView(row, now, fineCents));
}

// Empréstimos em aberto do aluno, os que pedem atenção primeiro.
export async function listMyLoans(userId: string): Promise<MyLoanView[]> {
  const supabase = await createSupabaseServerClient();
  const fineCents = await openFineCents(supabase, userId);
  return sortLoansByUrgency(await readOpenLoans(supabase, userId, fineCents));
}

// Resumo do aluno: livros, limite (3, ou 4 para formando), prazos e multa em aberto.
export async function getStudentSummary(userId: string): Promise<{ summary: StudentSummary; loans: MyLoanView[] }> {
  const supabase = await createSupabaseServerClient();
  const [fineCents, profile] = await Promise.all([
    openFineCents(supabase, userId),
    supabase.from("profiles").select("graduating").eq("id", userId).maybeSingle(),
  ]);
  if (profile.error) throw new Error("Não foi possível consultar o perfil.");
  const loans = sortLoansByUrgency(await readOpenLoans(supabase, userId, fineCents));
  return { summary: buildStudentSummary({ loans, graduating: Boolean(profile.data?.graduating), openFineCents: fineCents }), loans };
}

// Reservas de livro do aluno, as mais recentes primeiro.
export async function listMyBookReservations(userId: string): Promise<MyReservationView[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("id, status, created_at, books(title, code)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(RESERVATIONS_LIMIT);
  if (error) throw new Error("Não foi possível consultar as reservas.");
  return (data as unknown as MyReservationRow[]).map(toMyReservationView);
}

// Multas do aluno, as em aberto primeiro (e as mais recentes dentro de cada grupo).
export async function listMyFines(userId: string): Promise<MyFineView[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fines")
    .select("id, days_late, amount_cents, paid_at, loans(due_at, books(title, code))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(FINES_LIMIT);
  if (error) throw new Error("Não foi possível consultar as multas.");
  const views = (data as unknown as MyFineRow[]).map(toMyFineView);
  return [...views.filter((fine) => !fine.paid), ...views.filter((fine) => fine.paid)];
}

// Renovação pelo aluno: a regra é toda da função renew_loan do banco (dono do empréstimo, atraso, multa, reserva de outra
// pessoa e limite de 3 renovações). Aqui só se traduz a resposta; as mensagens de multa e atraso são as do aluno, não as do balcão.
export async function renewMyLoan(
  loanId: string,
  idempotencyKey: string,
): Promise<LoanActionResult<{ newDueOn: string; renewals: number }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("renew_loan", { p_loan_id: loanId, p_idempotency_key: idempotencyKey });
  if (error) {
    console.error("Falha ao renovar o empréstimo do aluno:", error.message);
    const code = loanErrorCode(error);
    if (code === "user_has_pending") return { ok: false, message: STUDENT_RENEW_BLOCK_MESSAGES.open_fine };
    if (code === "loan_overdue") return { ok: false, message: STUDENT_RENEW_BLOCK_MESSAGES.overdue };
    return { ok: false, message: loanErrorMessage(error) };
  }
  const loan = data as { due_at: string; renewals: number } | null;
  if (!loan) return { ok: false, message: GENERIC_LOAN_ERROR };
  return { ok: true, newDueOn: formatLoanDate(new Date(loan.due_at)), renewals: loan.renewals };
}
