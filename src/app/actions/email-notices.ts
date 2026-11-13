"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/services/profile.service";
import { setMyEmailNotices } from "@/services/email-notices.service";
import { noticePreferencesPath } from "@/domain/notices/loan-notice";

export interface EmailNoticesState {
  status: "idle" | "success" | "error";
  message: string;
}

// Liga ou desliga o aviso de prazo por e-mail da própria pessoa. Quem é a pessoa vem da sessão, nunca do formulário.
export async function saveEmailNotices(_previous: EmailNoticesState, formData: FormData): Promise<EmailNoticesState> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", message: "Sua sessão acabou. Entre de novo para mudar a preferência." };

  // Caixa marcada envia "on"; desmarcada não envia nada.
  const enabled = formData.get("enabled") === "on";
  if ((await setMyEmailNotices(enabled)) === "failed") {
    return { status: "error", message: "Não foi possível salvar agora. Tente de novo em instantes." };
  }

  revalidatePath(noticePreferencesPath(profile.role));
  return {
    status: "success",
    message: enabled ? "Pronto! Você vai receber os avisos de prazo por e-mail." : "Pronto! Você não vai mais receber avisos de prazo por e-mail.",
  };
}
