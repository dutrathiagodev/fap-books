import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { decideRoute } from "@/domain/access/access-rules";
import type { UserRole } from "@/types/profile";

// Proxy (no Next.js 16 é o antigo "middleware"): roda antes de cada página.
// 1) Renova a sessão do Supabase para o usuário continuar logado.
// 2) Protege as rotas por perfil: quem não está logado vai para /login e cada perfil só abre a própria área.
// As páginas conferem o perfil de novo (getCurrentProfile): o proxy é a primeira porta, não a única.
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
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  // Sem perfil ativo, a pessoa é tratada como não logada.
  let role: UserRole | null = null;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .eq("active", true)
      .maybeSingle();
    role = (profile?.role as UserRole | undefined) ?? null;
  }

  const decision = decideRoute(request.nextUrl.pathname, role);
  if (decision.action === "allow") return response;

  // Leva junto os cookies da sessão renovada, senão o login se perde no redirecionamento.
  const redirect = NextResponse.redirect(new URL(decision.to, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Ignora arquivos estáticos e imagens.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
