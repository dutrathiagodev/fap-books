"use client";

import { useState, useTransition } from "react";
import { EMPTY_BOOK_FORM, bookFormErrors } from "@/domain/books/book-form-rules";
import type { BookCreateResult, BookFormField, BookFormValues } from "@/types/book";
import { BookCoverUpload } from "./BookCoverUpload";
import { BookFormFields } from "./BookFormFields";
import { BookFormSave, type BookSaveStatus } from "./BookFormSave";

const MESSAGES = {
  duplicate_code: "Já existe um livro com esse código de chamada.",
  invalid: "Confira os campos destacados.",
  error: "Não foi possível salvar o livro. Tente novamente.",
} as const;

// Cadastro de livro (Figma, card 0117) ligado à gravação. A ação roda no servidor, que valida tudo de novo.
export function BookCreateForm({ onCreate }: { onCreate: (values: BookFormValues) => Promise<BookCreateResult> }) {
  const [values, setValues] = useState<BookFormValues>(EMPTY_BOOK_FORM);
  const [status, setStatus] = useState<BookSaveStatus>("idle");
  const [error, setError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<BookFormField, string>>>({});
  const [pending, startTransition] = useTransition();

  function fail(reason: keyof typeof MESSAGES, errors: Partial<Record<BookFormField, string>> = {}) {
    setFieldErrors(errors);
    setError(MESSAGES[reason]);
    setStatus("error");
  }

  function save() {
    const errors = bookFormErrors(values);
    if (Object.keys(errors).length > 0) return fail("invalid", errors);

    setFieldErrors({});
    startTransition(async () => {
      try {
        const result = await onCreate(values);
        if (result.ok) {
          setValues(EMPTY_BOOK_FORM);
          setError(undefined);
          setStatus("success");
        } else {
          fail(result.reason, result.reason === "invalid" ? result.errors : {});
        }
      } catch {
        fail("error");
      }
    });
  }

  function change(next: BookFormValues) {
    setValues(next);
    setFieldErrors({});
    setStatus("idle");
  }

  return (
    <BookFormSave mode="create" status={pending ? "saving" : status} error={error} onSave={save}>
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
