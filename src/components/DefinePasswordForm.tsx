"use client";

import { useActionState, useState } from "react";
import { Check, Circle, ChevronRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { definePasswordFromInvite } from "@/app/actions/define-password";
import { INITIAL_DEFINE_PASSWORD_STATE } from "@/domain/auth/define-password-state";
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MESSAGES,
  PASSWORD_MIN_LENGTH,
  validatePassword,
} from "@/domain/auth/password-rules";
import type { InviteLink } from "@/domain/auth/invite-token";
import { Button } from "./Button";
import { InviteLinkProblem } from "./InviteLinkProblem";
import { TextField } from "./TextField";

function ShowHideButton({ shown, onToggle, label }: { shown: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${shown ? "Ocultar" : "Mostrar"} ${label}`}
      aria-pressed={shown}
      className="flex size-11 cursor-pointer md:size-8 items-center justify-center rounded-md text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
    >
      {shown ? <EyeOff size={18} strokeWidth={1.5} aria-hidden /> : <Eye size={18} strokeWidth={1.5} aria-hidden />}
    </button>
  );
}

function Rule({ done, children }: { done: boolean; children: string }) {
  const Icon = done ? Check : Circle;
  return (
    <li className={`flex items-center gap-2 text-xs ${done ? "text-success-700 dark:text-success-100" : "text-ink-muted"}`}>
      <Icon size={14} strokeWidth={1.5} aria-hidden />
      {children}
      <span className="sr-only">{done ? " (cumprido)" : " (ainda não)"}</span>
    </li>
  );
}

// Formulário "Defina sua senha" do convite. O token vai em campos escondidos e só é gasto no envio (Server Action).
// A conferência aqui é só conforto (feedback na hora); o servidor confere tudo de novo.
export function DefinePasswordForm({ link }: { link: InviteLink }) {
  const [state, formAction, pending] = useActionState(definePasswordFromInvite, INITIAL_DEFINE_PASSWORD_STATE);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirmation: false });

  if (state.status === "link_invalid") return <InviteLinkProblem kind="invalid" />;
  if (state.status === "inactive") return <InviteLinkProblem kind="inactive" />;
  if (state.status === "failed_after_use") return <InviteLinkProblem kind="used" />;

  const live = validatePassword(password, confirmation);
  // O que o servidor devolveu vale até a pessoa mexer nos campos de novo; depois vale a conferência ao vivo.
  const check = state.status === "invalid_fields" ? state.check : live;
  const passwordError = (touched.password || state.status === "invalid_fields") && check.password ? PASSWORD_MESSAGES[check.password] : undefined;
  const confirmationError =
    (touched.confirmation || state.status === "invalid_fields") && confirmation && check.confirmation
      ? PASSWORD_MESSAGES[check.confirmation]
      : undefined;
  const formMessage =
    state.status === "rate_limited"
      ? state.message
      : state.status === "failed"
        ? "Não foi possível salvar a sua senha agora. Confira a conexão e tente de novo."
        : "";

  return (
    <>
      <div className="flex flex-col gap-1 text-center md:text-left">
        <h1 className="text-h3 md:text-h2">Defina sua senha</h1>
        <p className="text-sm text-ink-muted">Falta só isto para acessar a biblioteca. Você vai entrar logo em seguida.</p>
      </div>
      <form action={formAction} className="flex w-full flex-col gap-4" noValidate>
        <input type="hidden" name="token_hash" value={link.tokenHash} />
        <input type="hidden" name="type" value={link.type} />
        <TextField
          id="password"
          label="Nova senha"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          requiredMark={false}
          leadingIcon={LockKeyhole}
          value={password}
          onChange={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={passwordError}
          trailing={<ShowHideButton shown={showPassword} onToggle={() => setShowPassword((v) => !v)} label="senha" />}
        />
        <TextField
          id="confirmation"
          label="Repita a senha"
          type={showConfirmation ? "text" : "password"}
          autoComplete="new-password"
          required
          requiredMark={false}
          leadingIcon={LockKeyhole}
          value={confirmation}
          onChange={setConfirmation}
          onBlur={() => setTouched((t) => ({ ...t, confirmation: true }))}
          error={confirmationError}
          trailing={
            <ShowHideButton shown={showConfirmation} onToggle={() => setShowConfirmation((v) => !v)} label="confirmação da senha" />
          }
        />
        <ul aria-label="Regras da senha" className="flex flex-col gap-1">
          <Rule done={[...password].length >= PASSWORD_MIN_LENGTH}>{`Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`}</Rule>
          <Rule done={password.length > 0 && !live.confirmation}>As duas senhas são iguais</Rule>
        </ul>
        <p className="text-xs text-ink-muted">
          Use letras, números ou frases: o tamanho é o que mais protege (até {PASSWORD_MAX_BYTES} caracteres).
        </p>
        <Button
          type="submit"
          text={pending ? "Salvando..." : "Definir senha e entrar"}
          icon={pending ? undefined : ChevronRight}
          loading={pending}
        />
        <p role="alert" className="min-h-5 text-sm text-danger">
          {formMessage}
        </p>
      </form>
    </>
  );
}
