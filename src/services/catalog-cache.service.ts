import { cacheLife, cacheTag, updateTag } from "next/cache";
import { createSupabaseAnonClient } from "@/lib/supabase/anon-client";

// Etiqueta do cache do acervo: as ações que mudam livros chamam invalidateCatalogCache() para a lista renovar na hora.
export const CATALOG_CACHE_TAG = "catalogo";

// Categorias do acervo: dado IGUAL para todas as pessoas, por isso pode ficar em cache compartilhado (FAP-0230).
// Lê com a chave pública (função public_book_categories), sem sessão. Renova sozinho a cada hora e na hora em que
// um livro é criado, editado, inativado ou excluído. Se a leitura falhar, nada é guardado e o erro sobe.
export async function getCachedCategories(activeOnly: boolean): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const { data, error } = await createSupabaseAnonClient().rpc("public_book_categories", { p_active_only: activeOnly });
  if (error) throw new Error("Não foi possível carregar as categorias.");
  return data as string[];
}

// Chame depois de qualquer ação que muda o acervo. Só funciona dentro de Server Action.
export function invalidateCatalogCache(): void {
  updateTag(CATALOG_CACHE_TAG);
}
