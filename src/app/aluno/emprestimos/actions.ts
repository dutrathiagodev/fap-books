"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/domain/books/book-rules";
import { STUDENT_HOME_PATH, STUDENT_LOANS_PATH } from "@/domain/student/student-rules";
import { requireRole } from "@/lib/require-role";
import { renewMyLoan } from "@/services/student.service";
import type { LoanActionResult } from "@/types/loan";

// Server Action é porta pública: confere de novo quem está logado (só o aluno) e valida o que veio do navegador.
// Quem decide se o empréstimo é dele e se pode renovar é a função renew_loan do banco.
export async function renewMyLoanAction(
  loanId: string,
  idempotencyKey: string,
): Promise<LoanActionResult<{ newDueOn: string; renewals: number }>> {
  await requireRole("student");
  if (!isUuid(String(loanId))) return { ok: false, message: "Empréstimo não encontrado." };
  if (!isUuid(String(idempotencyKey))) return { ok: false, message: "Ação inválida. Atualize a tela e tente de novo." };

  const result = await renewMyLoan(loanId, idempotencyKey);
  if (result.ok) {
    revalidatePath(STUDENT_HOME_PATH);
    revalidatePath(STUDENT_LOANS_PATH);
  }
  return result;
}
