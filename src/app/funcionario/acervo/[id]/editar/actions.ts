"use server";

import { revalidatePath } from "next/cache";
import { ACERVO_PATH } from "@/domain/access/access-rules";
import { bookFormErrors, parseBookForm, toBookUpdate } from "@/domain/books/book-form-rules";
import { requireRole } from "@/lib/require-role";
import { updateBook } from "@/services/books.service";
import type { BookUpdateResult } from "@/types/book";

// Confere de novo quem está logado e todas as regras do formulário: o que veio do navegador nunca é confiável.
export async function updateBookAction(id: string, input: unknown): Promise<BookUpdateResult> {
  const profile = await requireRole("librarian");

  const values = parseBookForm(input);
  if (!values) return { ok: false, reason: "invalid", errors: {} };
  const errors = bookFormErrors(values);
  if (Object.keys(errors).length > 0) return { ok: false, reason: "invalid", errors };

  // O id também vem do navegador: updateBook só aceita UUID.
  const result = await updateBook(String(id), toBookUpdate(values), profile.id);
  if (result.ok) revalidatePath(ACERVO_PATH);
  return result;
}
