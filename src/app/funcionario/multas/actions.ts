"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/domain/books/book-rules";
import { FINES_PATH } from "@/domain/fines/fine-rules";
import { requireRole } from "@/lib/require-role";
import { payFine } from "@/services/fines.service";
import type { FineActionResult } from "@/types/fine";

// Server Action é uma porta pública: confere de novo quem está logado (só a bibliotecária) e valida o que veio do
// navegador. O servidor decide; a tela só pede.
export async function payFineAction(fineId: string, idempotencyKey: string): Promise<FineActionResult> {
  await requireRole("librarian");
  if (!isUuid(String(fineId))) return { ok: false, message: "Multa não encontrada. Atualize a tela e confira a lista.", final: true };
  if (!isUuid(String(idempotencyKey))) {
    return { ok: false, message: "Ação inválida. Atualize a tela e tente de novo.", final: true };
  }

  const result = await payFine(fineId, idempotencyKey);
  if (result.ok) revalidatePath(FINES_PATH);
  return result;
}
