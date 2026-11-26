"use server";

import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/domain/access/access-rules";
import { isUuid } from "@/domain/books/book-rules";
import { hasErrors, isValidIsoDate, validateLoanValues } from "@/domain/loan-records/loan-record-rules";
import { createLoanRecord, deleteLoanRecord, markLoanRecordReturned } from "@/services/loan-records.service";
import { getCurrentProfile } from "@/services/profile.service";
import type { LoanRecord, LoanRecordErrors, LoanRecordValues } from "@/types/loan-record";

// Server Actions do controle de empréstimo de livros. Server Action é uma porta pública: cada uma confere o login e valida de
// novo o que veio do navegador; quem decide de verdade o que a pessoa pode mexer é o RLS do banco.

export type LoanRecordResult =
  | { ok: true; record: LoanRecord }
  | { ok: false; message: string; errors?: LoanRecordErrors };

const GENERIC = "Não foi possível concluir agora. Tente de novo.";

async function requireLogin() {
  const profile = await getCurrentProfile();
  if (!profile) redirect(LOGIN_PATH);
  return profile;
}

export async function addLoanRecordAction(values: LoanRecordValues): Promise<LoanRecordResult> {
  await requireLogin();
  const errors = validateLoanValues(values);
  if (hasErrors(errors)) return { ok: false, message: "Confira os campos.", errors };
  const result = await createLoanRecord(values);
  return result.ok ? { ok: true, record: result.data } : { ok: false, message: GENERIC };
}

export async function returnLoanRecordAction(id: string, returnedOn: string): Promise<LoanRecordResult> {
  await requireLogin();
  if (!isUuid(id) || !isValidIsoDate(returnedOn)) return { ok: false, message: GENERIC };
  const result = await markLoanRecordReturned(id, returnedOn);
  return result.ok ? { ok: true, record: result.data } : { ok: false, message: "Este empréstimo já foi devolvido ou não existe mais." };
}

export async function deleteLoanRecordAction(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireLogin();
  if (!isUuid(id)) return { ok: false, message: GENERIC };
  const result = await deleteLoanRecord(id);
  return result.ok ? { ok: true } : { ok: false, message: "Este empréstimo não existe mais." };
}
