"use server";

import { revalidatePath } from "next/cache";
import { ACERVO_PATH } from "@/domain/access/access-rules";
import { bookFormErrors, parseBookForm, toBookRow } from "@/domain/books/book-form-rules";
import { IMPORT_MAX_BYTES, importRowError, parseBookImport, parseBookRows, type BookImportParse } from "@/domain/books/book-import";
import { detectImportFormat } from "@/domain/books/book-import-xlsx";
import { inspectCover, type CleanCover } from "@/domain/books/cover-image";
import { COVER_MAX_BYTES } from "@/domain/books/cover-rules";
import { requireRole } from "@/lib/require-role";
import { invalidateCatalogCache } from "@/services/catalog-cache.service";
import { removeBookCover, uploadBookCover } from "@/services/book-cover.service";
import { createBook } from "@/services/books.service";
import { readXlsxRows } from "@/services/xlsx-reader.service";
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
  if (result.ok) {
    revalidatePath(ACERVO_PATH);
    invalidateCatalogCache();
  } else if (stored) {
    // O livro não foi gravado: a capa enviada não pode ficar solta no Storage.
    await removeBookCover(stored.path);
  }
  return result;
}

// Lê o arquivo enviado (.csv ou .xlsx) e devolve as linhas já conferidas pelo parser, ou o motivo de recusar.
// Ordem: tamanho, extensão e tipo (MIME) e só então os bytes. O .xlsx é aberto por xlsx-reader.service.ts.
async function parseUpload(file: File): Promise<BookImportParse | Extract<BookImportResult, { ok: false }>> {
  if (file.size > IMPORT_MAX_BYTES) return { ok: false, reason: "too_big" };
  const kind = detectImportFormat(file.name, file.type);
  if (!kind.ok) return kind;

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (kind.format === "csv") {
    // Um .xlsx renomeado para .csv começa com "PK" (zip): melhor avisar do que reclamar de colunas.
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) return { ok: false, reason: "invalid_file" };
    return parseBookImport(new TextDecoder().decode(bytes));
  }
  const sheet = await readXlsxRows(bytes);
  return sheet.ok ? parseBookRows(sheet.rows) : sheet;
}

// Importação em lote (card 0117, aba "Importar planilha"; aceita .csv e .xlsx). Confere quem está logado, o tamanho do
// arquivo e cada linha com as mesmas regras do formulário. As linhas boas são gravadas uma a uma (cada livro vai para a auditoria e um código
// repetido recusa só aquela linha); as ruins voltam com a linha e o motivo, para corrigir e reenviar.
export async function importBooksAction(formData: FormData): Promise<BookImportResult> {
  const profile = await requireRole("librarian");

  const file = formData.get("planilha");
  if (!(file instanceof File) || file.size === 0) return { ok: false, reason: "no_file" };

  const parsed = await parseUpload(file);
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

  if (imported > 0) {
    revalidatePath(ACERVO_PATH);
    invalidateCatalogCache();
  }
  return { ok: true, imported, errors };
}
