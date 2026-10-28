"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/domain/books/book-rules";
import { requireRole } from "@/lib/require-role";
import { deleteBook, inactivateBook } from "@/services/books.service";
import type { BookActionResult } from "@/types/book";

const ACERVO_PATH = "/funcionario/acervo";

// As duas ações conferem de novo quem está logado: só a bibliotecária exclui ou inativa livro.
export async function deleteBookAction(bookId: string): Promise<BookActionResult> {
  const profile = await requireRole("librarian");
  if (!isUuid(bookId)) return { ok: false, reason: "not_found" };

  const result = await deleteBook(bookId, profile.id);
  if (result.ok) revalidatePath(ACERVO_PATH);
  return result;
}

export async function inactivateBookAction(bookId: string): Promise<BookActionResult> {
  const profile = await requireRole("librarian");
  if (!isUuid(bookId)) return { ok: false, reason: "not_found" };

  const result = await inactivateBook(bookId, profile.id);
  if (result.ok) revalidatePath(ACERVO_PATH);
  return result;
}
