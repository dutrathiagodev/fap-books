"use server";

import { parseSubscription } from "@/domain/newsletter/newsletter-rules";
import { addSubscriber } from "@/services/newsletter.service";

export interface NewsletterState {
  status: "idle" | "success" | "error";
  message: string;
}

const SUCCESS: NewsletterState = {
  status: "success",
  message: "Inscrição feita! Você vai receber as novidades da biblioteca por e-mail.",
};

// Inscrição na newsletter da landing. Valida tudo no servidor e nunca devolve o erro bruto do banco.
export async function subscribeToNewsletter(_previous: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const parsed = parseSubscription({
    name: formData.get("name"),
    email: formData.get("email"),
    consent: formData.get("consent"),
    website: formData.get("website"),
  });

  // Robô: finge que deu certo e não grava nada.
  if (parsed.status === "bot") return SUCCESS;
  if (parsed.status === "invalid") return { status: "error", message: parsed.message };

  const result = await addSubscriber(parsed.data);
  if (result === "failed") {
    return { status: "error", message: "Não foi possível fazer a inscrição agora. Tente de novo mais tarde." };
  }
  return SUCCESS;
}
