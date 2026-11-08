import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { GENERIC_LOAN_ERROR, loanErrorMessage } from "@/domain/loans/loan-errors";
import { escapeLike } from "@/domain/loans/loan-lookup-rules";
import {
  calculateDueDate,
  calculateFine,
  fineSentence,
  formatLoanDate,
  isOverdue,
  limitNotice,
  loanBlockReason,
  LOAN_BLOCK_MESSAGES,
} from "@/domain/loans/loan-rules";
import { toOpenLoanView, type OpenLoanRow } from "@/domain/loans/loan-views";
import type { LoanActionResult, LoanPreview, LoanReceipt, OpenLoanView } from "@/types/loan";
import { shelfByBook, shelfStatus, type ShelfRow } from "./book-shelf";

const LIST_LIMIT = 50;
// Tetos das leituras (regra do plano gratuito: toda consulta tem limite). Folgados de propósito: o limite de livros é 3 ou 4,
// então um usuário nunca chega perto; as multas só precisam mostrar se há alguma e somar as das pessoas da lista.
const OPEN_LOANS_PER_USER_LIMIT = 100;
const OPEN_FINES_LIMIT = 500;

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// Soma das multas em aberto (centavos) de uma lista de usuários, por usuário.
async function openFinesByUser(supabase: Client, userIds: string[]): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (userIds.length === 0) return totals;
  const { data, error } = await supabase
    .from("fines")
    .select("user_id, amount_cents")
    .in("user_id", userIds)
    .is("paid_at", null)
    .limit(OPEN_FINES_LIMIT);
  if (error) throw new Error("Não foi possível consultar as multas.");
  for (const fine of data) totals.set(fine.user_id, (totals.get(fine.user_id) ?? 0) + fine.amount_cents);
  return totals;
}

interface Targets {
  userId: string;
  userName: string;
  graduating: boolean;
  bookId: string;
  bookTitle: string;
  bookQuantity: number;
}

// Usuário e livro são achados pela matrícula e pelo tombo (únicos no banco), então nenhum id passa pelo navegador.
async function findTargets(supabase: Client, registration: string, code: string): Promise<LoanActionResult<{ targets: Targets }>> {
  const [user, book] = await Promise.all([
    supabase.from("profiles").select("id, full_name, graduating").eq("registration", registration).eq("active", true).maybeSingle(),
    supabase.from("books").select("id, title, quantity").eq("code", code).eq("status", "active").maybeSingle(),
  ]);
  if (user.error || book.error) return { ok: false, message: GENERIC_LOAN_ERROR };
  if (!user.data) return { ok: false, message: loanErrorMessage({ message: "user_not_found" }) };
  if (!book.data) return { ok: false, message: loanErrorMessage({ message: "book_not_found" }) };
  return {
    ok: true,
    targets: {
      userId: user.data.id,
      userName: user.data.full_name,
      graduating: Boolean(user.data.graduating),
      bookId: book.data.id,
      bookTitle: book.data.title,
      bookQuantity: book.data.quantity,
    },
  };
}

function receiptOf(targets: Targets, borrowedAt: Date, dueAt: Date): LoanReceipt {
  return {
    userName: targets.userName,
    bookTitle: targets.bookTitle,
    borrowedOn: formatLoanDate(borrowedAt),
    dueOn: formatLoanDate(dueAt),
  };
}

// Passo 3 (Resumo): só leitura. Mostra as datas e já avisa se algo bloqueia, para a bibliotecária saber antes de confirmar.
// Quem decide de verdade é o banco, na função create_loan (registerLoan).
export async function previewLoan(registration: string, code: string): Promise<LoanActionResult<{ preview: LoanPreview }>> {
  const now = new Date();
  const supabase = await createSupabaseServerClient();
  const found = await findTargets(supabase, registration, code);
  if (!found.ok) return found;
  const { targets } = found;

  const [loans, fines, shelf] = await Promise.all([
    supabase
      .from("loans")
      .select("book_id, due_at")
      .eq("user_id", targets.userId)
      .is("returned_at", null)
      .limit(OPEN_LOANS_PER_USER_LIMIT),
    openFinesByUser(supabase, [targets.userId]).catch(() => null),
    supabase.rpc("book_availability"),
  ]);
  if (loans.error || shelf.error || !fines) return { ok: false, message: GENERIC_LOAN_ERROR };

  const { situation, freeCopies } = shelfStatus(targets.bookQuantity, shelfByBook(shelf.data as ShelfRow[]).get(targets.bookId));
  const reason = loanBlockReason({
    activeLoans: loans.data.length,
    graduating: targets.graduating,
    openFineCents: fines.get(targets.userId) ?? 0,
    hasOverdueLoan: loans.data.some((loan) => isOverdue(new Date(loan.due_at), now)),
    hasThisBook: loans.data.some((loan) => loan.book_id === targets.bookId),
    freeCopies: situation === "available" ? freeCopies : 0,
  });

  return {
    ok: true,
    preview: {
      receipt: receiptOf(targets, now, calculateDueDate(now)),
      notice: limitNotice(loans.data.length, targets.graduating),
      blocked: reason ? LOAN_BLOCK_MESSAGES[reason] : null,
    },
  };
}

// Linha devolvida pelas funções do banco (create_loan, return_loan e renew_loan devolvem o empréstimo).
interface LoanRow {
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  renewals: number;
}

// Passo 4 (Confirmar): o banco confere limite, multa, atraso, exemplar livre e reservas, grava e audita numa transação só.
// A chave de idempotência (uma por ação, vinda da tela) faz o clique duplo e a nova tentativa de rede valerem uma vez.
export async function registerLoan(registration: string, code: string, idempotencyKey: string): Promise<LoanActionResult<{ receipt: LoanReceipt }>> {
  const supabase = await createSupabaseServerClient();
  const found = await findTargets(supabase, registration, code);
  if (!found.ok) return found;
  const { targets } = found;

  const { data, error } = await supabase.rpc("create_loan", {
    p_book_id: targets.bookId,
    p_user_id: targets.userId,
    p_idempotency_key: idempotencyKey,
  });
  if (error) {
    console.error("Falha ao registrar o empréstimo:", error.message);
    return { ok: false, message: loanErrorMessage(error) };
  }
  const loan = data as LoanRow;
  return { ok: true, receipt: receiptOf(targets, new Date(loan.borrowed_at), new Date(loan.due_at)) };
}

// Empréstimos em aberto para as abas Devolução e Renovação, os mais atrasados primeiro.
// A busca por usuário (nome ou matrícula) e por livro (título ou tombo) acha os ids antes: os filtros levam só uuids.
export async function listOpenLoans(term: string): Promise<OpenLoanView[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("loans")
    .select(
      "id, user_id, borrowed_at, due_at, renewals, profiles!loans_user_id_fkey(full_name, registration), books(title, code)",
    )
    .is("returned_at", null)
    .order("due_at", { ascending: true })
    .limit(LIST_LIMIT);

  if (term) {
    const pattern = escapeLike(term);
    // Cada coluna é consultada à parte com .ilike(): o texto digitado vai como parâmetro, nunca dentro de um filtro .or.
    const found = await Promise.all([
      supabase.from("profiles").select("id").ilike("full_name", `%${pattern}%`).limit(50),
      supabase.from("profiles").select("id").ilike("registration", `${pattern}%`).limit(50),
      supabase.from("books").select("id").ilike("title", `%${pattern}%`).limit(50),
      supabase.from("books").select("id").ilike("code", `${pattern}%`).limit(50),
    ]);
    if (found.some((result) => result.error)) throw new Error("Não foi possível fazer a consulta.");
    const [byName, byRegistration, byTitle, byCode] = found.map((result) => (result.data ?? []).map((row) => row.id));
    const filters = [
      ...new Set([...byName, ...byRegistration]),
    ].map((id) => `user_id.eq.${id}`).concat([...new Set([...byTitle, ...byCode])].map((id) => `book_id.eq.${id}`));
    if (filters.length === 0) return [];
    query = query.or(filters.join(","));
  }

  const { data, error } = await query;
  if (error) throw new Error("Não foi possível consultar os empréstimos.");
  const rows = data as unknown as OpenLoanRow[];
  const fines = await openFinesByUser(supabase, [...new Set(rows.map((row) => row.user_id))]);
  const now = new Date();
  return rows.map((row) => toOpenLoanView(row, now, fines.get(row.user_id) ?? 0));
}

// Devolução: a função return_loan fecha o empréstimo e grava a multa (R$ 1,00 por dia). Aqui só sai o texto do aviso,
// calculado com a mesma regra para mostrar na tela.
export async function registerReturn(
  loanId: string,
  idempotencyKey: string,
): Promise<LoanActionResult<{ daysLate: number; fineSentence: string | null }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("return_loan", { p_loan_id: loanId, p_idempotency_key: idempotencyKey });
  if (error) {
    console.error("Falha ao registrar a devolução:", error.message);
    return { ok: false, message: loanErrorMessage(error) };
  }
  const loan = data as LoanRow;
  const { daysLate } = calculateFine(new Date(loan.due_at), new Date(loan.returned_at ?? Date.now()));
  return { ok: true, daysLate, fineSentence: daysLate > 0 ? fineSentence(daysLate) : null };
}

// Renovação: a função renew_loan confere atraso, multa, reservas e o limite de renovações.
export async function renewLoan(
  loanId: string,
  idempotencyKey: string,
): Promise<LoanActionResult<{ newDueOn: string; renewals: number }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("renew_loan", { p_loan_id: loanId, p_idempotency_key: idempotencyKey });
  if (error) {
    console.error("Falha ao renovar o empréstimo:", error.message);
    return { ok: false, message: loanErrorMessage(error) };
  }
  const loan = data as LoanRow;
  return { ok: true, newDueOn: formatLoanDate(new Date(loan.due_at)), renewals: loan.renewals };
}
