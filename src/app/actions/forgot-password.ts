"use server";

// Imports relativos nos módulos puros: o Vitest do projeto não resolve o apelido "@/" (só o que o teste simula).
import { headers } from "next/headers";
import type { ForgotPasswordState } from "../../domain/auth/forgot-password-state";
import { parseRecoveryEmail } from "../../domain/auth/recovery-email";
import { getClientIp, tooManyRequestsMessage } from "../../lib/rate-limit";
import { withMinimumDuration } from "../../lib/minimum-duration";
import { forgotPasswordEmailLimiter, forgotPasswordIpLimiter } from "@/lib/request-limits";
import { getInviteRedirectUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

// Piso de tempo da resposta (ver minimum-duration.ts): esconde se o e-mail foi mesmo enviado.
const MINIMUM_RESPONSE_MS = 1500;

// Pede o link de redefinição de senha (FAP-0266). Segurança:
// - a resposta é a mesma para e-mail com conta, sem conta ou inativo (o Supabase também não diferencia): nunca revela se a conta existe;
// - limite por IP e por e-mail antes de falar com o Supabase (cada pedido gasta um e-mail da cota);
// - nada de e-mail ou token vai para o log, só o código do erro;
// - o link chega pelo modelo "Reset password" do Supabase (docs/email/recuperar-senha.html), que leva a /definir-senha?type=recovery.
//   Lá o token só é gasto no envio do formulário, e perfil inativo é recusado (define-password.ts).
export async function requestPasswordReset(
  _previous: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = parseRecoveryEmail(formData.get("email"));
  if (parsed.status === "invalid") return { status: "invalid_email" };

  // Depois da validação (erro de digitação não gasta a cota) e antes do Supabase (abuso não custa envio).
  const ipLimit = forgotPasswordIpLimiter.check(getClientIp(await headers()));
  if (!ipLimit.allowed) return { status: "rate_limited", message: tooManyRequestsMessage(ipLimit.retryAfterSeconds) };
  const emailLimit = forgotPasswordEmailLimiter.check(parsed.email);
  if (!emailLimit.allowed) return { status: "rate_limited", message: tooManyRequestsMessage(emailLimit.retryAfterSeconds) };

  return withMinimumDuration(MINIMUM_RESPONSE_MS, async () => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.email, { redirectTo: getInviteRedirectUrl() });
    if (!error) return { status: "sent" } as const;

    console.error("Falha ao pedir o link de redefinição de senha:", error.code ?? "sem código");
    // Erro de rede ou do Supabase (5xx): a pessoa pode tentar de novo; não diz nada sobre a conta.
    const serverSide = (error.status ?? 0) >= 500 || error.name === "AuthRetryableFetchError";
    // Qualquer outro erro (cota de e-mails do Supabase, pedido seguido em menos de 60 s, e-mail rejeitado) responde igual a
    // "enviado": mostrar a diferença revelaria quais e-mails têm cadastro.
    return serverSide ? ({ status: "failed" } as const) : ({ status: "sent" } as const);
  });
}
