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
export function BookCreateForm({ onCreate }: { onCreate: (formData: FormData) => Promise<BookCreateResult> }) {
  const [values, setValues] = useState<BookFormValues>(EMPTY_BOOK_FORM);
  const [status, setStatus] = useState<BookSaveStatus>("idle");
  const [error, setError] = useState<string | undefined>();
  const [cover, setCover] = useState<File | null>(null);
  const [coverKey, setCoverKey] = useState(0);
  const [coverError, setCoverError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<BookFormField, string>>>({});
  const [pending, startTransition] = useTransition();

  function fail(reason: keyof typeof MESSAGES, errors: Partial<Record<BookFormField, string>> = {}, coverMessage?: string) {
    setCoverError(coverMessage);
    setFieldErrors(errors);
    setError(MESSAGES[reason]);
    setStatus("error");
  }

  function save() {
    const errors = bookFormErrors(values);
    if (Object.keys(errors).length > 0) return fail("invalid", errors);

    setFieldErrors({});
    setCoverError(undefined);
    // O servidor recebe os campos como JSON e a capa como arquivo, e confere os dois.
    const formData = new FormData();
    formData.set("values", JSON.stringify(values));
    if (cover) formData.set("cover", cover);
    startTransition(async () => {
      try {
        const result = await onCreate(formData);
        if (result.ok) {
          setValues(EMPTY_BOOK_FORM);
          setCover(null);
          setCoverKey((key) => key + 1);
          setError(undefined);
          setStatus("success");
        } else {
          fail(
            result.reason === "invalid_cover" ? "invalid" : result.reason,
            result.reason === "invalid" ? result.errors : {},
            result.reason === "invalid_cover" ? result.message : undefined,
          );
        }
      } catch {
        fail("error");
      }
    });
  }

  function changeCover(file: File | null) {
    setCover(file);
    setCoverError(undefined);
    setStatus("idle");
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
          {/* A chave zera a prévia depois de salvar. */}
          <BookCoverUpload key={coverKey} disabled={pending} error={coverError} onChange={changeCover} />
        </div>
        <div className="md:col-start-1 md:row-start-1">
          <BookFormFields values={values} errors={fieldErrors} disabled={pending} onChange={change} />
        </div>
      </div>
    </BookFormSave>
  );
}
