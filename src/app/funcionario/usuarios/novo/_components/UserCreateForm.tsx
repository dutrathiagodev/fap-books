"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, Check, CircleAlert, CircleCheck, Mail } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  EMPTY_USER_FORM,
  USERS_PATH,
  USER_FORM_MESSAGES,
  fieldsFor,
  userFormErrors,
  type UserCreateResult,
  type UserFormErrors,
  type UserFormValues,
} from "@/domain/users/user-form-rules";
import type { UserRole } from "@/types/profile";
import { GuidelinesPanel } from "./GuidelinesPanel";
import { ProfileSelector } from "./ProfileSelector";
import { UserFormFields } from "./UserFormFields";

type Status = "idle" | "saving" | "success" | "error";

interface UserCreateFormProps {
  // Ação do servidor, que valida tudo de novo.
  onCreate: (input: unknown) => Promise<UserCreateResult>;
  cancelHref?: string;
}

const BUTTON =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-70 md:w-auto";

// Cadastro de usuários (FAP-0087, frame 0121): seletor de perfil, campos do perfil, diretrizes e aviso de convite.
export function UserCreateForm({ onCreate, cancelHref = USERS_PATH }: UserCreateFormProps) {
  const [values, setValues] = useState<UserFormValues>(EMPTY_USER_FORM);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<UserFormErrors>({});
  // Chave nova depois de salvar: os campos esquecem o "já mexeu" e o formulário limpo não aparece cheio de erros.
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();

  const role = values.role === "" ? null : values.role;

  function fail(message: string, errors: UserFormErrors = {}) {
    setFieldErrors(errors);
    setError(message);
    setStatus("error");
  }

  function selectRole(next: UserRole) {
    // Troca de perfil mantém os dados comuns e limpa o que era só do perfil anterior.
    const keep = new Set(fieldsFor(next));
    const cleared = { ...EMPTY_USER_FORM, role: next };
    for (const field of keep) if (field !== "role") Object.assign(cleared, { [field]: values[field] });
    setValues(cleared);
    setFieldErrors({});
    setStatus("idle");
  }

  function save() {
    const errors = userFormErrors(values);
    if (Object.keys(errors).length > 0) return fail(USER_FORM_MESSAGES.invalid, errors);

    setFieldErrors({});
    startTransition(async () => {
      try {
        const result = await onCreate(values);
        if (result.ok) {
          setValues({ ...EMPTY_USER_FORM, role: values.role });
          setFormKey((key) => key + 1);
          setError(undefined);
          setStatus("success");
        } else {
          const errors = result.reason === "invalid" ? result.errors : {};
          // Os dois "já existe" apontam o campo, além do alerta geral.
          if (result.reason === "duplicate_email") errors.email = USER_FORM_MESSAGES.duplicate_email;
          if (result.reason === "duplicate_registration") errors.registration = USER_FORM_MESSAGES.duplicate_registration;
          fail(USER_FORM_MESSAGES[result.reason], errors);
        }
      } catch {
        fail(USER_FORM_MESSAGES.error);
      }
    });
  }

  const saving = pending;

  return (
    <div>
      <PageHeader
        title="Cadastro de usuário"
        breadcrumbs={[{ label: "Biblioteca" }, { label: "Usuários" }, { label: "Cadastro" }]}
        description="Cadastre alunos, professores e funcionários com acesso integrado ao acervo da biblioteca."
        action={
          <Link
            href={cancelHref}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-medium text-brand hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
            Voltar
          </Link>
        }
      />

      <div aria-busy={saving} className="max-w-6xl">
        <div className="grid grid-cols-1 items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="@container flex flex-col gap-6 rounded-lg border border-line bg-surface p-4 shadow-sm md:p-7">
          <ProfileSelector value={values.role} onChange={selectRole} disabled={saving} error={fieldErrors.role} />

          {/* A chave zera os campos depois de salvar. */}
          <UserFormFields key={formKey} values={values} errors={fieldErrors} disabled={saving} onChange={setValues} />

          <p className="flex items-start gap-2 rounded-md border border-line bg-subtle px-4 py-3 text-sm text-ink">
            <Mail size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-brand" />
            Não há senha provisória: a pessoa recebe um convite por e-mail e define a própria senha.
          </p>
        </section>
        <GuidelinesPanel role={role} />
        </div>

        {status === "success" && (
          <p
            role="status"
            className="mt-6 flex w-full items-center gap-2 rounded-md border border-success-700 bg-success-100 px-3 py-2 text-sm text-success-700 shadow-md md:ml-auto md:w-fit"
          >
            <CircleCheck size={16} strokeWidth={1.5} aria-hidden />
            Usuário cadastrado. O convite foi enviado por e-mail.
            <Link href={USERS_PATH} className="font-medium underline">
              Ver lista de usuários
            </Link>
          </p>
        )}
        {status === "error" && (
          <p role="alert" className="mt-6 flex items-start gap-2 rounded-md border border-danger-700 bg-danger-100 px-3 py-2 text-sm text-danger-700">
            <CircleAlert size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-ink-muted max-md:hidden">* Campos de preenchimento obrigatório</p>
          <div className="flex flex-col-reverse gap-2 md:flex-row">
            {saving ? (
              <span aria-disabled="true" className={`${BUTTON} border border-line bg-surface text-ink opacity-70`}>
                Cancelar
              </span>
            ) : (
              <Link href={cancelHref} className={`${BUTTON} border border-line bg-surface text-ink hover:bg-subtle`}>
                Cancelar
              </Link>
            )}
            <button type="button" onClick={save} disabled={saving} className={`${BUTTON} bg-brand text-on-brand hover:bg-brand-hover`}>
              {saving ? (
                "Salvando..."
              ) : (
                <>
                  <Check size={16} strokeWidth={1.5} aria-hidden />
                  Salvar usuário
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
