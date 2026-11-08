"use server";

import { headers } from "next/headers";
import { getClientIp, tooManyRequestsMessage } from "@/lib/rate-limit";
import { newsletterLimiter } from "@/lib/request-limits";
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

  // Depois da validação, para um erro de digitação não gastar a cota; antes do banco, para o abuso não custar nada.
  const limit = newsletterLimiter.check(getClientIp(await headers()));
  if (!limit.allowed) return { status: "error", message: tooManyRequestsMessage(limit.retryAfterSeconds) };

  const result = await addSubscriber(parsed.data);
  if (result === "failed") {
    return { status: "error", message: "Não foi possível fazer a inscrição agora. Tente de novo mais tarde." };
  }
  return SUCCESS;
}
