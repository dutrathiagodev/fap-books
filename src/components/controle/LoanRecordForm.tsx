"use client";

import { useState } from "react";
import { EMPTY_LOAN_VALUES, LOAN_RECORD_CATEGORIES } from "@/domain/loan-records/loan-record-rules";
import type { LoanRecordErrors, LoanRecordField, LoanRecordValues } from "@/types/loan-record";
import { Button } from "../Button";
import { FieldError } from "../FieldError";
import { TextField } from "../TextField";

interface LoanRecordFormProps {
  // Devolve os erros por campo (ou nada, se salvou). Quem fala com o banco é a tela que usa o formulário.
  onSubmit: (values: LoanRecordValues) => Promise<{ errors?: LoanRecordErrors; message?: string } | void>;
  pending: boolean;
}

// Formulário de novo empréstimo: título, autor, leitor, categoria, data do empréstimo e data prevista de devolução.
// Controlado com useState; depois de salvar, volta ao vazio.
export function LoanRecordForm({ onSubmit, pending }: LoanRecordFormProps) {
  const [values, setValues] = useState<LoanRecordValues>(EMPTY_LOAN_VALUES);
  const [errors, setErrors] = useState<LoanRecordErrors>({});
  const [message, setMessage] = useState("");

  const set = (field: LoanRecordField) => (value: string) => setValues((current) => ({ ...current, [field]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const result = await onSubmit(values);
    if (result?.errors || result?.message) {
      setErrors(result.errors ?? {});
      setMessage(result.message ?? "");
      return;
    }
    setErrors({});
    setValues(EMPTY_LOAN_VALUES);
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Novo empréstimo" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 md:p-6">
      <h2 className="text-h3">Novo empréstimo</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField id="lr-title" label="Título do livro" required value={values.bookTitle} error={errors.bookTitle} onChange={set("bookTitle")} maxLength={200} />
        <TextField id="lr-author" label="Autor" required value={values.author} error={errors.author} onChange={set("author")} maxLength={120} />
        <TextField id="lr-reader" label="Nome do leitor" required value={values.readerName} error={errors.readerName} onChange={set("readerName")} maxLength={120} autoComplete="off" />
        <div className="flex flex-col gap-2">
          <label htmlFor="lr-category" className="text-sm leading-6 font-medium text-ink">
            Categoria / gênero <span aria-hidden>*</span>
          </label>
          <select
            id="lr-category"
            value={values.category}
            onChange={(event) => set("category")(event.target.value)}
            aria-invalid={errors.category ? true : undefined}
            aria-describedby={errors.category ? "lr-category-error" : undefined}
            className={`h-11 w-full rounded-md border bg-surface px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-focus mouse:h-10 ${errors.category ? "border-danger" : "border-line-strong"}`}
          >
            <option value="">Escolha uma categoria</option>
            {LOAN_RECORD_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {errors.category && <FieldError id="lr-category-error" message={errors.category} />}
        </div>
        <TextField id="lr-loaned" label="Data do empréstimo" type="date" required value={values.loanedOn} error={errors.loanedOn} onChange={set("loanedOn")} />
        <TextField id="lr-due" label="Data prevista de devolução" type="date" required value={values.dueOn} error={errors.dueOn} onChange={set("dueOn")} min={values.loanedOn || undefined} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" text={pending ? "Salvando..." : "Registrar empréstimo"} fullWidth={false} loading={pending} />
        {message && (
          <p role="alert" className="text-sm text-danger-700 dark:text-red-300">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
