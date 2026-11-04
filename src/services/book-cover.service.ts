import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { CleanCover } from "@/domain/books/cover-image";

const BUCKET = "book-covers";

export interface StoredCover {
  path: string;
  url: string;
}

// Envia a capa já conferida e sem metadados ao bucket. O nome é gerado aqui (uuid + extensão do tipo detectado):
// o nome do arquivo original nunca é usado. A policy do bucket só deixa a bibliotecária gravar; qualquer falha vira null.
export async function uploadBookCover(cover: CleanCover): Promise<StoredCover | null> {
  const supabase = await createSupabaseServerClient();
  const path = `${randomUUID()}.${cover.extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, cover.bytes, {
    contentType: cover.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return null;

  return { path, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

// Apaga uma capa enviada (usado quando o livro não chegou a ser gravado). Se falhar, o arquivo fica órfão e o erro vai ao log.
export async function removeBookCover(path: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error("Falha ao remover a capa enviada:", error.message);
}
