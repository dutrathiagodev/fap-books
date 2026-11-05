"use server";

import { revalidatePath } from "next/cache";
import { ACERVO_PATH } from "@/domain/access/access-rules";
import { bookFormErrors, parseBookForm, toBookRow } from "@/domain/books/book-form-rules";
import { IMPORT_MAX_BYTES, importRowError, parseBookImport } from "@/domain/books/book-import";
import { inspectCover, type CleanCover } from "@/domain/books/cover-image";
import { COVER_MAX_BYTES } from "@/domain/books/cover-rules";
import { requireRole } from "@/lib/require-role";
import { removeBookCover, uploadBookCover } from "@/services/book-cover.service";
import { createBook } from "@/services/books.service";
import type { BookCreateResult, BookImportResult, BookImportRowError } from "@/types/book";

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
  if (result.ok) revalidatePath(ACERVO_PATH);
  // O livro não foi gravado: a capa enviada não pode ficar solta no Storage.
  else if (stored) await removeBookCover(stored.path);
  return result;
}

// Importação em lote (card 0117, aba "Importar planilha"). Confere quem está logado, o tamanho do arquivo e cada linha
// com as mesmas regras do formulário. As linhas boas são gravadas uma a uma (cada livro vai para a auditoria e um código
// repetido recusa só aquela linha); as ruins voltam com a linha e o motivo, para corrigir e reenviar.
export async function importBooksAction(formData: FormData): Promise<BookImportResult> {
  const profile = await requireRole("librarian");

  const file = formData.get("planilha");
  if (!(file instanceof File) || file.size === 0) return { ok: false, reason: "no_file" };
  if (file.size > IMPORT_MAX_BYTES) return { ok: false, reason: "too_big" };

  const parsed = parseBookImport(await file.text());
  if (!parsed.ok) return parsed;

  const errors: BookImportRowError[] = [];
  let imported = 0;
  for (const { line, values } of parsed.rows) {
    const problem = importRowError(values);
    if (problem) {
      errors.push({ line, message: problem });
      continue;
    }
    const result = await createBook(toBookRow(values), profile.id);
    if (result.ok) imported++;
    else errors.push({ line, message: result.reason === "duplicate_code" ? "Já existe um livro com esse código de chamada." : "Não foi possível gravar esta linha." });
  }

  if (imported > 0) revalidatePath(ACERVO_PATH);
  return { ok: true, imported, errors };
}
