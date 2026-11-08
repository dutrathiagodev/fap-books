import { createClient } from "@supabase/supabase-js";

// Cliente do Supabase com a chave SECRETA (ignora o RLS). Só para código do SERVIDOR, e só depois de conferir
// que quem pede é a bibliotecária (ex.: convidar um usuário novo). Nunca importar de componente de cliente:
// a chave não tem o prefixo NEXT_PUBLIC_, então o Next não a envia ao navegador.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Falta a chave secreta do Supabase. Preencha SUPABASE_SERVICE_ROLE_KEY no .env.local (Secret key, sb_secret_) para cadastrar usuários.",
    );
  }

  // Sem sessão guardada: este cliente só executa a chamada administrativa e some.
  return createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
