"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { BOOK_AREAS, BOOK_CIRCULATION, EMPTY_BOOK_FORM, bookFormErrors } from "@/domain/books/book-form-rules";
import type { BookFormField, BookFormValues } from "@/types/book";
import { FieldError } from "./FieldError";
import { TextField } from "./TextField";

export interface BookFormFieldsProps {
  // Valores controlados. Sem eles, o bloco começa vazio, como no frame de cadastro.
  values?: BookFormValues;
  areas?: readonly string[];
  circulations?: readonly string[];
  // Erros de fora (o salvar entra no card seguinte). O bloco também marca o campo ao sair dele.
  errors?: Partial<Record<BookFormField, string>>;
  disabled?: boolean;
  onChange?: (values: BookFormValues) => void;
}

const NARROW_QUERY = "(max-width: 767px)";

function subscribeNarrow(onChange: () => void): () => void {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useNarrowScreen(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}

const CONTROL =
  "h-10 w-full rounded-md border bg-surface px-4 text-base text-ink outline-offset-2 placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50";

function controlClass(invalid: boolean): string {
  return `${CONTROL} ${invalid ? "border-danger-700" : "border-line focus-visible:border-focus"}`;
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

function Field({ id, label, required, error, className, children }: FieldProps) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <label htmlFor={id} className="text-sm leading-6 font-medium text-ink">
        {label}
        {required && (
          <span aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  );
}

// Campos e validações do cadastro de livro (Figma, card 0117). No computador, pares em duas colunas; no celular, uma.
// Campos do design system: rótulo 24 + 8 + campo 40. Distância de uma linha à outra: 90 px no computador e 86 px no celular, como no frame.
export function BookFormFields({
  values: controlled,
  areas = BOOK_AREAS,
  circulations = BOOK_CIRCULATION,
  errors: externalErrors,
  disabled = false,
  onChange,
}: BookFormFieldsProps) {
  const [internal, setInternal] = useState<BookFormValues>(controlled ?? EMPTY_BOOK_FORM);
  const [touched, setTouched] = useState<Partial<Record<BookFormField, boolean>>>({});
  const values = controlled ?? internal;
  const computed = bookFormErrors(values, areas, circulations);
  const noAreas = areas.length === 0;
  const narrow = useNarrowScreen();

  function shownError(field: BookFormField): string | undefined {
    if (externalErrors?.[field]) return externalErrors[field];
    if (touched[field]) return computed[field];
    return undefined;
  }

  function update(field: BookFormField, value: string) {
    const next = { ...values, [field]: value };
    if (!controlled) setInternal(next);
    onChange?.(next);
  }

  function touch(field: BookFormField) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  return (
    <fieldset disabled={disabled} className="min-w-0 border-0 p-0">
      <legend className="sr-only">Campos do livro</legend>

      {noAreas && (
        <p role="status" className="mb-4 rounded-md border border-line bg-subtle px-4 py-3 text-sm text-ink-muted">
          Nenhuma área cadastrada. O livro não pode ser classificado até existir uma área.
        </p>
      )}

      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2 md:gap-y-[18px]">
        <TextField
          id="book-title"
          name="title"
          label="Título do livro"
          required
          placeholder="Ex.: Tratado de Fisiologia Médica"
          value={values.title}
          error={shownError("title")}
          onBlur={() => touch("title")}
          onChange={(value) => update("title", value)}
          className="md:col-span-2"
        />

        <TextField
          id="book-authors"
          name="authors"
          label="Autor(es)"
          required
          placeholder={narrow ? "Ex.: John E. Hall" : "Ex.: John E. Hall, Arthur C. Guyton"}
          value={values.authors}
          error={shownError("authors")}
          onBlur={() => touch("authors")}
          onChange={(value) => update("authors", value)}
        />

        <Field id="book-category" label="Categoria" required error={shownError("category")}>
          <span className="relative">
            <select
              id="book-category"
              name="category"
              required
              value={values.category}
              disabled={noAreas}
              aria-invalid={Boolean(shownError("category"))}
              aria-describedby={shownError("category") ? "book-category-error" : undefined}
              onBlur={() => touch("category")}
              onChange={(event) => update("category", event.target.value)}
              className={`${controlClass(Boolean(shownError("category")))} appearance-none pr-10`}
            >
              <option value="">{noAreas ? "Nenhuma área disponível" : "Selecione uma área"}</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              strokeWidth={1.5}
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted"
            />
          </span>
        </Field>

        <TextField
          id="book-call-number"
          name="callNumber"
          label="Código de chamada (CDD)"
          required
          placeholder="Ex.: 612.01 G993t"
          value={values.callNumber}
          error={shownError("callNumber")}
          onBlur={() => touch("callNumber")}
          onChange={(value) => update("callNumber", value)}
        />

        <TextField
          id="book-isbn"
          name="isbn"
          label="ISBN-13"
          placeholder="Ex.: 978-85-352-8761-5"
          inputMode="numeric"
          value={values.isbn}
          error={shownError("isbn")}
          onBlur={() => touch("isbn")}
          onChange={(value) => update("isbn", value)}
        />

        <TextField
          id="book-quantity"
          name="quantity"
          label="Quantidade de exemplares"
          required
          inputMode="numeric"
          value={values.quantity}
          error={shownError("quantity")}
          onBlur={() => touch("quantity")}
          onChange={(value) => update("quantity", value)}
        />

        <div className="max-md:hidden">
          <Field id="book-circulation" label="Status inicial do acervo" error={shownError("circulation")}>
            <span className="relative">
              <select
                id="book-circulation"
                name="circulation"
                value={values.circulation}
                aria-invalid={Boolean(shownError("circulation"))}
                aria-describedby={shownError("circulation") ? "book-circulation-error" : undefined}
                onBlur={() => touch("circulation")}
                onChange={(event) => update("circulation", event.target.value)}
                className={`${controlClass(Boolean(shownError("circulation")))} appearance-none pr-10`}
              >
                {circulations.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                strokeWidth={1.5}
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted"
              />
            </span>
          </Field>
        </div>

        <TextField
          id="book-publisher"
          name="publisher"
          label="Editora"
          placeholder="Ex.: Elsevier"
          value={values.publisher}
          error={shownError("publisher")}
          onBlur={() => touch("publisher")}
          onChange={(value) => update("publisher", value)}
        />

        <TextField
          id="book-edition"
          name="edition"
          label="Edição / ano"
          placeholder="Ex.: 13ª edição (2021)"
          value={values.edition}
          error={shownError("edition")}
          onBlur={() => touch("edition")}
          onChange={(value) => update("edition", value)}
        />
      </div>
    </fieldset>
  );
}
