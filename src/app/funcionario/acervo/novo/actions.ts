"use server";

import { revalidatePath } from "next/cache";
import { bookFormErrors, parseBookForm, toBookRow } from "@/domain/books/book-form-rules";
import { inspectCover, type CleanCover } from "@/domain/books/cover-image";
import { COVER_MAX_BYTES } from "@/domain/books/cover-rules";
import { requireRole } from "@/lib/require-role";
import { removeBookCover, uploadBookCover } from "@/services/book-cover.service";
import { createBook } from "@/services/books.service";
import type { BookCreateResult } from "@/types/book";

function parseValues(formData: FormData): unknown {
  const raw = formData.get("values");
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Confere de novo quem está logado, as regras do formulário e os bytes da capa: o que veio do navegador nunca é confiável.
// A capa é opcional; sem arquivo, o livro é gravado sem cover_url.
export async function createBookAction(formData: FormData): Promise<BookCreateResult> {
  const profile = await requireRole("librarian");

  const values = parseBookForm(parseValues(formData));
  if (!values) return { ok: false, reason: "invalid", errors: {} };
  const errors = bookFormErrors(values);
  if (Object.keys(errors).length > 0) return { ok: false, reason: "invalid", errors };

  const file = formData.get("cover");
  let cover: CleanCover | null = null;
  if (file instanceof File) {
    // O tamanho vem antes de ler o arquivo para a memória. O nome original do arquivo não é lido nem guardado.
    if (file.size === 0) return { ok: false, reason: "invalid_cover", message: "A imagem está vazia." };
    if (file.size > COVER_MAX_BYTES) return { ok: false, reason: "invalid_cover", message: "A imagem passa de 2 MB." };
    const inspection = inspectCover(new Uint8Array(await file.arrayBuffer()));
    if (!inspection.ok) return { ok: false, reason: "invalid_cover", message: inspection.error };
    cover = inspection.cover;
  }

  const stored = cover ? await uploadBookCover(cover) : null;
  if (cover && !stored) return { ok: false, reason: "error" };

  const result = await createBook({ ...toBookRow(values), cover_url: stored?.url ?? null }, profile.id);
  if (result.ok) revalidatePath("/funcionario/acervo");
  // O livro não foi gravado: a capa enviada não pode ficar solta no Storage.
  else if (stored) await removeBookCover(stored.path);
  return result;
}
