"use server";

import { revalidatePath } from "next/cache";
import { bookFormErrors, parseBookForm, toBookRow } from "@/domain/books/book-form-rules";
import { requireRole } from "@/lib/require-role";
import { createBook } from "@/services/books.service";
import type { BookCreateResult } from "@/types/book";

// Confere de novo quem está logado e todas as regras do formulário: o que veio do navegador nunca é confiável.
export async function createBookAction(input: unknown): Promise<BookCreateResult> {
  const profile = await requireRole("librarian");

  const values = parseBookForm(input);
  if (!values) return { ok: false, reason: "invalid", errors: {} };
  const errors = bookFormErrors(values);
  if (Object.keys(errors).length > 0) return { ok: false, reason: "invalid", errors };

  const result = await createBook(toBookRow(values), profile.id);
  if (result.ok) revalidatePath("/funcionario/acervo");
  return result;
}
