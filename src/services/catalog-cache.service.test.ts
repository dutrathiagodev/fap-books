import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheTag = vi.fn();
const cacheLife = vi.fn();
const updateTag = vi.fn();
const rpc = vi.fn();

vi.mock("next/cache", () => ({ cacheTag, cacheLife, updateTag }));
vi.mock("@/lib/supabase/anon-client", () => ({ createSupabaseAnonClient: () => ({ rpc }) }));

const { CATALOG_CACHE_TAG, getCachedCategories, invalidateCatalogCache } = await import("./catalog-cache.service");

beforeEach(() => vi.clearAllMocks());

describe("getCachedCategories", () => {
  it("lê pela função pública e marca o cache com a etiqueta do acervo", async () => {
    rpc.mockResolvedValue({ data: ["Ciências", "Literatura"], error: null });
    await expect(getCachedCategories(true)).resolves.toEqual(["Ciências", "Literatura"]);
    expect(rpc).toHaveBeenCalledWith("public_book_categories", { p_active_only: true });
    expect(cacheTag).toHaveBeenCalledWith(CATALOG_CACHE_TAG);
    expect(cacheLife).toHaveBeenCalledWith("hours");
  });

  it("repassa o filtro de livros ativos ao banco", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await getCachedCategories(false);
    expect(rpc).toHaveBeenCalledWith("public_book_categories", { p_active_only: false });
  });

  it("falha com mensagem própria, sem mostrar o erro bruto do banco", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "permission denied for function x" } });
    await expect(getCachedCategories(true)).rejects.toThrow("Não foi possível carregar as categorias.");
  });
});

describe("invalidateCatalogCache", () => {
  it("expira a etiqueta do acervo", () => {
    invalidateCatalogCache();
    expect(updateTag).toHaveBeenCalledWith(CATALOG_CACHE_TAG);
  });
});
