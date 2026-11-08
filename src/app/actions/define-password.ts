"use server";

// Imports relativos nos módulos puros: o Vitest do projeto não resolve o apelido "@/" (só o que o teste simula).
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROLE_LANDING } from "../../domain/access/access-rules";
import { parseInviteLink } from "../../domain/auth/invite-token";
import type { DefinePasswordState } from "../../domain/auth/define-password-state";
import { isPasswordValid, validatePassword } from "../../domain/auth/password-rules";
import { getClientIp, tooManyRequestsMessage } from "../../lib/rate-limit";
import { definePasswordLimiter } from "@/lib/request-limits";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { UserRole } from "@/types/profile";

// Define a senha a partir do link do convite. Só aqui, no ENVIO do formulário, o token é gasto (verifyOtp): abrir o
// link (GET) não consome nada, porque antivírus e leitores de e-mail pré-abrem os links e inutilizariam o convite.
// Nada de token, e-mail ou senha vai para o log; só o código do erro do Supabase.
export async function definePasswordFromInvite(
  _previous: DefinePasswordState,
  formData: FormData,
): Promise<DefinePasswordState> {
  const link = parseInviteLink(formData.get("token_hash"), formData.get("type"));
  if (!link) return { status: "link_invalid" };

  const password = formData.get("password");
  const confirmation = formData.get("confirmation");
  if (typeof password !== "string" || typeof confirmation !== "string") return { status: "failed" };

  const check = validatePassword(password, confirmation);
  if (!isPasswordValid(check)) return { status: "invalid_fields", check };

  // Depois da validação (erro de digitação não gasta a cota) e antes do Supabase (abuso não custa nada).
  const limit = definePasswordLimiter.check(getClientIp(await headers()));
  if (!limit.allowed) return { status: "rate_limited", message: tooManyRequestsMessage(limit.retryAfterSeconds) };

  const supabase = await createSupabaseServerClient();

  const verified = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type });
  const userId = verified.data.user?.id;
  if (verified.error || !userId) {
    const code = verified.error?.code;
    // Erro de rede ou do Supabase (5xx) não é culpa do link: o token continua valendo, a pessoa pode tentar de novo.
    const serverSide = (verified.error?.status ?? 0) >= 500 || verified.error?.name === "AuthRetryableFetchError";
    console.error("Falha ao conferir o link do convite:", code ?? "sem código");
    return serverSide ? { status: "failed" } : { status: "link_invalid" };
  }

  // Perfil inativo não entra: encerra a sessão que o link abriu e não define a senha.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .eq("active", true)
    .maybeSingle();
  if (profileError) {
    console.error("Falha ao ler o perfil do convite:", profileError.code ?? "sem código");
    await supabase.auth.signOut();
    return { status: "failed_after_use" };
  }
  if (!profile) {
    await supabase.auth.signOut();
    return { status: "inactive" };
  }

  const updated = await supabase.auth.updateUser({ password });
  if (updated.error) {
    console.error("Falha ao salvar a senha do convite:", updated.error.code ?? "sem código");
    await supabase.auth.signOut();
    return { status: "failed_after_use" };
  }

  redirect(ROLE_LANDING[profile.role as UserRole]);
}
