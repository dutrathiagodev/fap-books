import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSupabaseEnv } from "./env";

// Cliente do Supabase para código do SERVIDOR (páginas, services e Server Actions).
// No Next.js 16 o cookies() é assíncrono, por isso o "await".
async function buildSupabaseServerClient() {
  // Ler os cookies primeiro avisa o Next.js que esta página é dinâmica (depende de quem acessa).
  // Sem isso, a build tentaria montar a página antes e reclamaria da falta do .env.
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Em páginas (Server Components) não dá para gravar cookies.
          // Tudo bem: o proxy.ts renova a sessão a cada requisição.
        }
      },
    },
  });
}

// Um cliente por requisição: perfil, pesquisa e novidades da mesma página reaproveitam o mesmo cliente (e a mesma
// leitura dos cookies) em vez de montar um novo a cada consulta. O cache() do React vale só durante uma requisição,
// então nada é compartilhado entre pessoas (FAP-0267).
export const createSupabaseServerClient = cache(buildSupabaseServerClient);
