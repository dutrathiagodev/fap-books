import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

// Cliente do Supabase SEM sessão, só com a chave pública (anon). Serve para ler dado igual para todo mundo dentro de
// um cache compartilhado ("use cache"), onde não existe cookie nem pessoa. Só enxerga o que o banco libera ao anon:
// nunca use para dado por usuário (esses vão por createSupabaseServerClient, com RLS).
export function createSupabaseAnonClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
