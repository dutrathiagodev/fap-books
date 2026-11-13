"use client";

import { useActionState } from "react";
import { saveEmailNotices, type EmailNoticesState } from "@/app/actions/email-notices";
import { Button } from "./Button";
import { FieldError } from "./FieldError";

const INITIAL: EmailNoticesState = { status: "idle", message: "" };

// Preferência de avisos de prazo por e-mail (RF-24, LGPD): uma caixa e um botão. Reaproveita Button e FieldError.
export function EmailNoticesForm({ email, enabled }: { email: string; enabled: boolean }) {
  const [state, formAction, pending] = useActionState(saveEmailNotices, INITIAL);

  return (
    <form action={formAction} className="max-w-xl rounded-lg border border-line bg-surface p-6">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="mt-1 size-4 shrink-0 accent-brand" />
        <span>
          <span className="block text-sm font-medium">Receber avisos de prazo por e-mail</span>
          <span className="mt-1 block text-sm text-ink-muted">
            Enviamos para <strong className="font-medium text-ink">{email}</strong> um lembrete quando faltarem 2 dias para devolver um livro, no dia do
            prazo e quando o livro estiver atrasado. Desmarque para não receber.
          </span>
        </span>
      </label>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button type="submit" text={pending ? "Salvando…" : "Salvar"} loading={pending} size="default" fullWidth={false} />
        {state.status === "success" && (
          <p role="status" className="text-sm text-success-700 dark:text-green-300">
            {state.message}
          </p>
        )}
      </div>
      {state.status === "error" && <FieldError message={state.message} className="mt-3" />}
    </form>
  );
}
