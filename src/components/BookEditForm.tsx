"use client";

import { useState, useTransition } from "react";
import { BOOK_FORM_MESSAGES, bookFormErrors } from "@/domain/books/book-form-rules";
import type { BookEditData, BookFormField, BookFormValues, BookUpdateResult } from "@/types/book";
import { BookCoverUpload } from "./BookCoverUpload";
import { BookFormFields } from "./BookFormFields";
import { BookFormSave, type BookSaveStatus } from "./BookFormSave";

type FieldErrors = Partial<Record<BookFormField, string>>;

const MESSAGES = {
  ...BOOK_FORM_MESSAGES,
  not_found: "Não encontramos este livro. Volte ao acervo e tente de novo.",
} as const;

// Edição de livro (mesmo layout do cadastro, card 0117) ligada à gravação. O servidor valida tudo de novo.
export function BookEditForm({
  book,
  onUpdate,
}: {
  book: BookEditData;
  onUpdate: (values: BookFormValues) => Promise<BookUpdateResult>;
}) {
  const [values, setValues] = useState<BookFormValues>(book.values);
  const [status, setStatus] = useState<BookSaveStatus>("idle");
  const [error, setError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  function fail(message: string, errors: FieldErrors = {}) {
    setFieldErrors(errors);
    setError(message);
    setStatus("error");
  }

  function save() {
    const errors = bookFormErrors(values);
    if (Object.keys(errors).length > 0) return fail(MESSAGES.invalid, errors);

    setFieldErrors({});
    startTransition(async () => {
      try {
        const result = await onUpdate(values);
        if (result.ok) {
          setError(undefined);
          setStatus("success");
        } else if (result.reason === "invalid") {
          fail(MESSAGES.invalid, result.errors);
        } else if (result.reason === "quantity_below_loans") {
          const message = `Há ${result.openLoans} exemplares emprestados. A quantidade não pode ser menor.`;
          fail(message, { quantity: message });
        } else {
          fail(MESSAGES[result.reason]);
        }
      } catch {
        fail(MESSAGES.error);
      }
    });
  }

  function change(next: BookFormValues) {
    setValues(next);
    setFieldErrors({});
    setStatus("idle");
  }

  return (
    <BookFormSave mode="edit" status={pending ? "saving" : status} error={error} onSave={save}>
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_16.25rem] md:gap-8">
        <div className="md:col-start-2 md:row-start-1">
          <BookCoverUpload disabled={pending} />
        </div>
        <div className="md:col-start-1 md:row-start-1">
          <BookFormFields values={values} errors={fieldErrors} disabled={pending} onChange={change} />
        </div>
      </div>
    </BookFormSave>
  );
}
