import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

// Proxy (no Next.js 16 é o antigo "middleware"): roda antes de cada página.
// Aqui ele só renova a sessão do Supabase para o usuário continuar logado.
// A proteção de rotas por perfil entra junto com o login (card FAP - 0007).
export async function proxy(request: NextRequest) {
  // Sem .env.local o projeto continua abrindo (útil no primeiro dia).
  if (!hasSupabaseEnv()) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Pedir os dados do usuário faz o Supabase renovar a sessão, se precisar.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  // Ignora arquivos estáticos e imagens.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
