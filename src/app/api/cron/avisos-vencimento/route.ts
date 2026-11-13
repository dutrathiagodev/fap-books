import { isValidCronAuthorization } from "@/lib/cron-auth";
import { resolveSiteOrigin } from "@/lib/site-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { getEmailProvider } from "@/services/email/email-provider";
import { runLoanNoticeBatch } from "@/services/loan-notices.service";

// Chamada todo dia pelo GitHub Actions (.github/workflows/avisos-vencimento.yml) com "Authorization: Bearer <CRON_SECRET>".
// Só aceita POST e só com o segredo certo; sem segredo configurado a rota fica fechada. A resposta tem apenas contadores.
// Até 50 e-mails por execução; 60 s dão folga para o envio em grupos de 5.
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!isValidCronAuthorization(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const summary = await runLoanNoticeBatch({
      admin: createSupabaseAdminClient(),
      provider: getEmailProvider(),
      siteOrigin: resolveSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV === "production"),
    });
    return Response.json(summary, { headers: NO_STORE });
  } catch (error) {
    // Só a mensagem (já escrita sem dado pessoal), nunca o objeto inteiro do erro.
    console.error("Aviso de prazo falhou:", error instanceof Error ? error.message : "erro desconhecido");
    return Response.json({ error: "failed" }, { status: 500, headers: NO_STORE });
  }
}
