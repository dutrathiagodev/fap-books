"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/domain/books/book-rules";
import { parseLookupTerm } from "@/domain/loans/loan-lookup-rules";
import { requireRole } from "@/lib/require-role";
import { searchBooksForLoan, searchUsers } from "@/services/loans-lookup.service";
import { previewLoan, registerLoan, registerReturn, renewLoan } from "@/services/loans.service";
import type { LoanActionResult, LoanPreview, LoanReceipt } from "@/types/loan";
import type { LoanBookCard, LoanUserCard } from "@/components/LoanSearch";

// Resposta das consultas do balcão: a lista (vazia se nada casou) ou o motivo de não ter consultado.
export type LookupResult<T> = { ok: true; items: T[] } | { ok: false; reason: "term_too_short" | "error" };

// As duas consultas conferem de novo quem está logado (Server Action é uma porta pública): só a bibliotecária.
export async function searchUsersAction(rawTerm: string): Promise<LookupResult<LoanUserCard>> {
  const profile = await requireRole("librarian");
  const parsed = parseLookupTerm(String(rawTerm));
  if (!parsed.ok) return parsed;

  try {
    return { ok: true, items: await searchUsers(parsed.term, profile.id) };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export async function searchBooksForLoanAction(rawTerm: string): Promise<LookupResult<LoanBookCard>> {
  await requireRole("librarian");
  const parsed = parseLookupTerm(String(rawTerm));
  if (!parsed.ok) return parsed;

  try {
    return { ok: true, items: await searchBooksForLoan(parsed.term) };
  } catch {
    return { ok: false, reason: "error" };
  }
}

// ---- Registro, devolução e renovação ----
// Toda ação confere de novo quem está logado (só a bibliotecária) e valida o que veio do navegador: o servidor decide.

const EMPRESTIMOS_PATH = "/funcionario/emprestimos";
const INVALID: LoanActionResult<never> = { ok: false, message: "Dados inválidos. Escolha o usuário e o livro de novo." };

// A matrícula (RA) tem de 5 a 8 números; o tombo é um texto curto sem caracteres de controle.
function validLoanKeys(registration: unknown, code: unknown): { registration: string; code: string } | null {
  if (typeof registration !== "string" || typeof code !== "string") return null;
  const cleanCode = code.trim();
  if (!/^[0-9]{5,8}$/.test(registration) || cleanCode.length < 1 || cleanCode.length > 60 || /\p{C}/u.test(cleanCode)) return null;
  return { registration, code: cleanCode };
}

export async function previewLoanAction(registration: string, code: string): Promise<LoanActionResult<{ preview: LoanPreview }>> {
  await requireRole("librarian");
  const keys = validLoanKeys(registration, code);
  return keys ? previewLoan(keys.registration, keys.code) : INVALID;
}

// A chave de idempotência (uuid) nasce na tela, uma por ação: o clique duplo e a nova tentativa de rede valem uma vez só.
const INVALID_KEY: LoanActionResult<never> = { ok: false, message: "Ação inválida. Atualize a tela e tente de novo." };

export async function registerLoanAction(
  registration: string,
  code: string,
  idempotencyKey: string,
): Promise<LoanActionResult<{ receipt: LoanReceipt }>> {
  await requireRole("librarian");
  const keys = validLoanKeys(registration, code);
  if (!keys) return INVALID;
  if (!isUuid(String(idempotencyKey))) return INVALID_KEY;

  const result = await registerLoan(keys.registration, keys.code, idempotencyKey);
  if (result.ok) revalidatePath(EMPRESTIMOS_PATH);
  return result;
}

export async function returnLoanAction(
  loanId: string,
  idempotencyKey: string,
): Promise<LoanActionResult<{ daysLate: number; fineSentence: string | null }>> {
  await requireRole("librarian");
  if (!isUuid(String(loanId))) return { ok: false, message: "Empréstimo não encontrado." };
  if (!isUuid(String(idempotencyKey))) return INVALID_KEY;

  const result = await registerReturn(loanId, idempotencyKey);
  if (result.ok) revalidatePath(EMPRESTIMOS_PATH);
  return result;
}

export async function renewLoanAction(
  loanId: string,
  idempotencyKey: string,
): Promise<LoanActionResult<{ newDueOn: string; renewals: number }>> {
  await requireRole("librarian");
  if (!isUuid(String(loanId))) return { ok: false, message: "Empréstimo não encontrado." };
  if (!isUuid(String(idempotencyKey))) return INVALID_KEY;

  const result = await renewLoan(loanId, idempotencyKey);
  if (result.ok) revalidatePath(EMPRESTIMOS_PATH);
  return result;
}
