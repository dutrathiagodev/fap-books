// Lê as variáveis do Supabase do arquivo .env.local.
// Se faltar alguma, o erro diz exatamente o que fazer (em vez de uma mensagem confusa).
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltam as variáveis do Supabase. Copie o arquivo .env.example para .env.local e preencha " +
        "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (veja docs/onboarding.md).",
    );
  }

  return { url, anonKey };
}

// Usado pelo proxy para só ligar o Supabase quando o ambiente está configurado.
export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
