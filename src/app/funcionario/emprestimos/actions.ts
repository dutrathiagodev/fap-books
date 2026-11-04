"use server";

import { parseLookupTerm } from "@/domain/loans/loan-lookup-rules";
import { requireRole } from "@/lib/require-role";
import { searchBooksForLoan, searchUsers } from "@/services/loans-lookup.service";
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
