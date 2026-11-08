"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { TextField } from "@/components/TextField";
import { userFormErrors, type UserFormErrors, type UserFormField, type UserFormValues } from "@/domain/users/user-form-rules";

interface UserFormFieldsProps {
  values: UserFormValues;
  // Erros que vêm do servidor. O bloco também marca o campo ao sair dele.
  errors?: UserFormErrors;
  disabled?: boolean;
  onChange: (values: UserFormValues) => void;
}

// Campos do cadastro que mudam com o perfil (cards 0123, 0124 e 0125):
// aluno = vínculo acadêmico (matrícula e curso); professor = só os dados comuns; funcionário = cargo.
export function UserFormFields({ values, errors: external, disabled = false, onChange }: UserFormFieldsProps) {
  const [touched, setTouched] = useState<Partial<Record<UserFormField, boolean>>>({});
  const computed = userFormErrors(values);

  function shown(field: UserFormField): string | undefined {
    if (external?.[field]) return external[field];
    return touched[field] ? computed[field] : undefined;
  }
  const bind = (field: UserFormField) => ({
    value: values[field],
    error: shown(field),
    onBlur: () => setTouched((current) => ({ ...current, [field]: true })),
    onChange: (value: string) => onChange({ ...values, [field]: value }),
  });

  return (
    <fieldset disabled={disabled} className="min-w-0 border-0 p-0">
      <legend className="sr-only">Dados do usuário</legend>
      <h2 className="mb-4 text-h3">Informações pessoais</h2>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2 md:gap-y-[18px]">
        <TextField
          id="user-name"
          name="fullName"
          label="Nome completo"
          required
          autoComplete="off"
          placeholder="Ex.: Maria de Souza"
          className="md:col-span-2"
          {...bind("fullName")}
        />
        <TextField
          id="user-email"
          name="email"
          type="email"
          label="E-mail"
          required
          autoComplete="off"
          inputMode="email"
          placeholder="Ex.: maria@exemplo.com"
          hint="O convite para criar a senha é enviado para este e-mail."
          {...bind("email")}
        />
        <TextField
          id="user-phone"
          name="phone"
          label="Telefone (WhatsApp)"
          autoComplete="off"
          inputMode="numeric"
          placeholder="Ex.: (11) 98765-4321"
          hint="Usado nos avisos da biblioteca."
          {...bind("phone")}
        />

        {values.role === "librarian" && (
          <TextField
            id="user-job-title"
            name="jobTitle"
            label="Cargo"
            required
            autoComplete="off"
            placeholder="Ex.: Chefe da biblioteca, Auxiliar"
            {...bind("jobTitle")}
          />
        )}
      </div>

      {values.role === "student" && (
        <section className="mt-8">
          <h2 className="mb-4 text-h3">Vínculo acadêmico (Aluno)</h2>
          <p className="mb-4 flex items-start gap-2 rounded-md border border-line bg-subtle px-4 py-3 text-sm text-ink">
            <Info size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-brand" />
            A matrícula (RA) identifica o aluno no balcão de empréstimo e não pode se repetir.
          </p>
          <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2 md:gap-y-[18px]">
            <TextField
              id="user-registration"
              name="registration"
              label="Matrícula (RA)"
              required
              autoComplete="off"
              inputMode="numeric"
              maxLength={8}
              placeholder="Ex.: 242802"
              hint="De 5 a 8 números."
              {...bind("registration")}
            />
            <TextField
              id="user-course"
              name="course"
              label="Curso"
              required
              autoComplete="off"
              placeholder="Ex.: Análise e Desenvolvimento de Sistemas"
              {...bind("course")}
            />

          </div>
        </section>
      )}
    </fieldset>
  );
}
