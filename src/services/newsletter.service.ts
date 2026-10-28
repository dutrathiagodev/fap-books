import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { CONSENT_TEXT_VERSION, type NewsletterSubscription } from "@/domain/newsletter/newsletter-rules";

export type AddSubscriberResult = "added" | "already_subscribed" | "failed";

// Grava a inscrição. O visitante só consegue inserir (RLS): ninguém lê a lista por aqui.
// E-mail repetido não é erro: devolvemos "already_subscribed" e a tela mostra o mesmo sucesso,
// para ninguém descobrir quem já está inscrito.
export async function addSubscriber({ email, fullName }: NewsletterSubscription): Promise<AddSubscriberResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email, full_name: fullName, consent_text_version: CONSENT_TEXT_VERSION });

    if (!error) return "added";
    // 23505 = violação de unicidade (e-mail já inscrito).
    return error.code === "23505" ? "already_subscribed" : "failed";
  } catch {
    // Sem .env ou banco fora do ar: a tela mostra uma mensagem própria, nunca o erro bruto.
    return "failed";
  }
}
