import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

// Cliente do Supabase para componentes do NAVEGADOR (os que têm "use client").
// Use só para login e logout. Dados do banco vão pelos services, no servidor.
export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
