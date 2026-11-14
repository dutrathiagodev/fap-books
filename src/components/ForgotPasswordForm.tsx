"use client";

import { useActionState, useState } from "react";
import { ChevronRight, CircleAlert, Info, Mail } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/forgot-password";
import { LOGIN_PATH } from "@/domain/access/access-rules";
import { INITIAL_FORGOT_PASSWORD_STATE } from "@/domain/auth/forgot-password-state";
import { INVALID_EMAIL_MESSAGE } from "@/domain/auth/recovery-email";
import { Button } from "./Button";
import { TextField } from "./TextField";
import { TextLink } from "./TextLink";

function Help({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-2 rounded-md bg-subtle px-4 py-3 text-sm text-ink-muted">
      <Info size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

function ErrorBanner({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-danger-700 bg-danger-100 px-3 py-2 text-sm text-danger-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
    >
      <CircleAlert size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

// Tela "Esqueci minha senha" (Figma, card 0266): pede o e-mail e mostra SEMPRE a mesma confirmação, haja ou não conta com ele.
// A validação daqui é só conforto: o servidor (Server Action) valida, limita as tentativas e fala com o Supabase.
export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, INITIAL_FORGOT_PASSWORD_STATE);
  const [email, setEmail] = useState("");
  // "Usar outro e-mail" guarda qual resultado já foi lido; o próximo pedido gera um resultado novo e volta a valer.
  const [dismissed, setDismissed] = useState<unknown>(null);

  if (state.status === "sent" && dismissed !== state) {
    return (
      <>
        <div className="flex flex-col gap-1 text-center md:text-left">
          <h1 className="text-h3 md:text-h2">Verifique o seu e-mail</h1>
          <p role="status" className="text-sm text-ink-muted">
            Se o e-mail informado tiver cadastro, enviamos o link para redefinir a senha. Ele vale por tempo limitado e só pode ser usado uma vez.
          </p>
        </div>
        <Button href={LOGIN_PATH} text="Voltar para o login" icon={ChevronRight} />
        <button
          type="button"
          onClick={() => setDismissed(state)}
          className="cursor-pointer self-center text-sm font-medium text-link underline focus-visible:outline-2 focus-visible:outline-focus"
        >
          Usar outro e-mail
        </button>
        <Help>Não chegou? Espere alguns minutos e olhe também a caixa de spam antes de pedir um novo link.</Help>
      </>
    );
  }

  const banner =
    state.status === "rate_limited"
      ? state.message
      : state.status === "failed"
        ? "Não foi possível enviar o link agora. Confira a conexão e tente de novo."
        : "";

  return (
    <>
      <div className="flex flex-col gap-1 text-center md:text-left">
        <h1 className="text-h3 md:text-h2">Esqueceu a sua senha?</h1>
        <p className="text-sm text-ink-muted">Informe o e-mail do seu cadastro. Enviaremos um link para você criar uma nova senha.</p>
      </div>
      <form action={formAction} className="flex w-full flex-col gap-4" noValidate>
        <TextField
          id="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="seu.nome@email.com"
          maxLength={254}
          required
          requiredMark={false}
          leadingIcon={Mail}
          value={email}
          onChange={setEmail}
          error={state.status === "invalid_email" ? INVALID_EMAIL_MESSAGE : undefined}
        />
        <Button
          type="submit"
          text={pending ? "Enviando..." : "Enviar link de redefinição"}
          icon={pending ? undefined : ChevronRight}
          loading={pending}
        />
        {banner ? <ErrorBanner>{banner}</ErrorBanner> : null}
        <TextLink href={LOGIN_PATH} className="self-center">
          Voltar para o login
        </TextLink>
      </form>
      <Help>Não chegou? Olhe também a caixa de spam. O link vale por tempo limitado e só pode ser usado uma vez.</Help>
    </>
  );
}
