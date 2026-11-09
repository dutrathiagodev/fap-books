"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { USER_ROLES, USER_ROLE_LABELS, type UserFormField } from "../domain/users/user-form-rules";
import { editValuesOf, userEditErrors, type UserEditErrors, type UserEditValues } from "../domain/users/user-edit-rules";
import type { UserView } from "../types/user-admin";
import { FieldError } from "./FieldError";
import { Modal } from "./Modal";
import { TextField } from "./TextField";

export interface UserEditModalProps {
  // A pessoa que está sendo editada; nula = modal fechado.
  user: UserView | null;
  pending?: boolean;
  // Erro geral da última tentativa e erros por campo vindos do servidor.
  error?: string;
  fieldErrors?: UserEditErrors;
  onSave: (values: UserEditValues) => void;
  onClose: () => void;
}

// Conteúdo do modal. Fica à parte para o formulário voltar aos dados da pessoa a cada abertura (o pai troca a "key").
function Body({ user, pending = false, error, fieldErrors, onSave, onClose }: UserEditModalProps & { user: UserView }) {
  const [values, setValues] = useState<UserEditValues>(() => editValuesOf(user));
  const [touched, setTouched] = useState<Partial<Record<UserFormField, boolean>>>({});
  const computed = userEditErrors(values);
  const roleLocked = user.isSelf;

  function shown(field: UserFormField): string | undefined {
    if (fieldErrors?.[field]) return fieldErrors[field];
    return touched[field] ? computed[field] : undefined;
  }
  const bind = (field: "fullName" | "phone" | "registration" | "course" | "jobTitle") => ({
    value: values[field],
    error: shown(field),
    disabled: pending,
    onBlur: () => setTouched((current) => ({ ...current, [field]: true })),
    onChange: (value: string) => setValues((current) => ({ ...current, [field]: value })),
  });

  function save() {
    if (Object.keys(computed).length > 0) {
      setTouched({ fullName: true, phone: true, registration: true, course: true, jobTitle: true });
      return;
    }
    onSave(values);
  }

  return (
    <Modal
      open
      title="Editar usuário"
      description="O e-mail é a identidade do login e não muda aqui."
      confirmLabel={pending ? "Salvando…" : "Salvar alterações"}
      confirmDisabled={pending}
      onConfirm={save}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-md bg-subtle px-3 py-2 text-sm text-ink-muted">
          E-mail: <span className="font-medium break-all text-ink">{user.email}</span>
        </p>

        <fieldset disabled={pending || roleLocked} className="min-w-0 border-0 p-0">
          <legend className="mb-2 text-sm leading-6 font-medium text-ink">Perfil</legend>
          <div className="flex flex-wrap gap-2">
            {USER_ROLES.map((role) => (
              <label
                key={role}
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${
                  values.role === role ? "border-brand bg-selected font-medium text-brand-ink" : "border-line bg-surface text-ink hover:bg-subtle"
                }`}
              >
                <input
                  type="radio"
                  name="edit-role"
                  value={role}
                  checked={values.role === role}
                  onChange={() => setValues((current) => ({ ...current, role, graduating: role === "student" && current.graduating }))}
                  className="sr-only"
                />
                {USER_ROLE_LABELS[role]}
              </label>
            ))}
          </div>
          {roleLocked && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-muted">
              <Info size={14} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
              Você não pode mudar o seu próprio perfil.
            </p>
          )}
        </fieldset>

        <TextField id="edit-name" label="Nome completo" required autoComplete="off" {...bind("fullName")} />
        <TextField
          id="edit-phone"
          label="Telefone (WhatsApp)"
          autoComplete="off"
          inputMode="numeric"
          placeholder="Ex.: (11) 98765-4321"
          {...bind("phone")}
        />
        {values.role === "student" && (
          <>
            <TextField id="edit-registration" label="Matrícula (RA)" required autoComplete="off" inputMode="numeric" maxLength={8} hint="De 5 a 8 números." {...bind("registration")} />
            <TextField id="edit-course" label="Curso" required autoComplete="off" {...bind("course")} />
            <label className="flex cursor-pointer items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={values.graduating}
                disabled={pending}
                onChange={(event) => setValues((current) => ({ ...current, graduating: event.target.checked }))}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-brand"
              />
              <span>
                Formando
                <span className="block text-xs text-ink-muted">Formandos podem ter até 4 livros ao mesmo tempo (os demais, 3).</span>
              </span>
            </label>
          </>
        )}
        {values.role === "librarian" && <TextField id="edit-job-title" label="Cargo" required autoComplete="off" placeholder="Ex.: Chefe da biblioteca, Auxiliar" {...bind("jobTitle")} />}
        {error && <FieldError message={error} />}
      </div>
    </Modal>
  );
}

// Modal de edição (card 0128): reaproveita os campos e as regras do cadastro, sem o e-mail.
export function UserEditModal(props: UserEditModalProps) {
  if (!props.user) return null;
  return <Body key={props.user.id} {...props} user={props.user} />;
}
