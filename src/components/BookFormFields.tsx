"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { BOOK_AREAS, BOOK_CIRCULATION, EMPTY_BOOK_FORM, bookFormErrors } from "@/domain/books/book-form-rules";
import type { BookFormField, BookFormValues } from "@/types/book";
import { FieldError } from "./FieldError";

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
  "h-11 w-full rounded-md border bg-surface px-4 text-base text-ink outline-offset-2 placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50";

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
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
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
// Espaço entre linhas medido no frame: 90 px de uma linha à outra no computador e 86 px no celular (rótulo 20 + 4 + campo 44 + respiro).
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

      <div className="grid grid-cols-1 gap-x-4 gap-y-[18px] md:grid-cols-2 md:gap-y-[22px]">
        <Field id="book-title" label="Título do livro" required error={shownError("title")} className="md:col-span-2">
          <input
            id="book-title"
            name="title"
            type="text"
            required
            value={values.title}
            placeholder="Ex.: Tratado de Fisiologia Médica"
            aria-invalid={Boolean(shownError("title"))}
            aria-describedby={shownError("title") ? "book-title-error" : undefined}
            onBlur={() => touch("title")}
            onChange={(event) => update("title", event.target.value)}
            className={controlClass(Boolean(shownError("title")))}
          />
        </Field>

        <Field id="book-authors" label="Autor(es)" required error={shownError("authors")}>
          <input
            id="book-authors"
            name="authors"
            type="text"
            required
            value={values.authors}
            placeholder={narrow ? "Ex.: John E. Hall" : "Ex.: John E. Hall, Arthur C. Guyton"}
            aria-invalid={Boolean(shownError("authors"))}
            aria-describedby={shownError("authors") ? "book-authors-error" : undefined}
            onBlur={() => touch("authors")}
            onChange={(event) => update("authors", event.target.value)}
            className={controlClass(Boolean(shownError("authors")))}
          />
        </Field>

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

        <Field id="book-call-number" label="Código de chamada (CDD)" required error={shownError("callNumber")}>
          <input
            id="book-call-number"
            name="callNumber"
            type="text"
            required
            value={values.callNumber}
            placeholder="Ex.: 612.01 G993t"
            aria-invalid={Boolean(shownError("callNumber"))}
            aria-describedby={shownError("callNumber") ? "book-call-number-error" : undefined}
            onBlur={() => touch("callNumber")}
            onChange={(event) => update("callNumber", event.target.value)}
            className={controlClass(Boolean(shownError("callNumber")))}
          />
        </Field>

        <Field id="book-isbn" label="ISBN-13" error={shownError("isbn")}>
          <input
            id="book-isbn"
            name="isbn"
            type="text"
            inputMode="numeric"
            value={values.isbn}
            placeholder="Ex.: 978-85-352-8761-5"
            aria-invalid={Boolean(shownError("isbn"))}
            aria-describedby={shownError("isbn") ? "book-isbn-error" : undefined}
            onBlur={() => touch("isbn")}
            onChange={(event) => update("isbn", event.target.value)}
            className={controlClass(Boolean(shownError("isbn")))}
          />
        </Field>

        <Field id="book-quantity" label="Quantidade de exemplares" required error={shownError("quantity")}>
          <input
            id="book-quantity"
            name="quantity"
            type="text"
            inputMode="numeric"
            required
            value={values.quantity}
            aria-invalid={Boolean(shownError("quantity"))}
            aria-describedby={shownError("quantity") ? "book-quantity-error" : undefined}
            onBlur={() => touch("quantity")}
            onChange={(event) => update("quantity", event.target.value)}
            className={controlClass(Boolean(shownError("quantity")))}
          />
        </Field>

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

        <Field id="book-publisher" label="Editora" error={shownError("publisher")}>
          <input
            id="book-publisher"
            name="publisher"
            type="text"
            value={values.publisher}
            placeholder="Ex.: Elsevier"
            aria-invalid={Boolean(shownError("publisher"))}
            aria-describedby={shownError("publisher") ? "book-publisher-error" : undefined}
            onBlur={() => touch("publisher")}
            onChange={(event) => update("publisher", event.target.value)}
            className={controlClass(Boolean(shownError("publisher")))}
          />
        </Field>

        <Field id="book-edition" label="Edição / ano" error={shownError("edition")}>
          <input
            id="book-edition"
            name="edition"
            type="text"
            value={values.edition}
            placeholder="Ex.: 13ª edição (2021)"
            aria-invalid={Boolean(shownError("edition"))}
            aria-describedby={shownError("edition") ? "book-edition-error" : undefined}
            onBlur={() => touch("edition")}
            onChange={(event) => update("edition", event.target.value)}
            className={controlClass(Boolean(shownError("edition")))}
          />
        </Field>
      </div>

      <p className="mt-4 text-xs text-ink-muted">
        <span aria-hidden>* </span>
        Campos de preenchimento obrigatório
      </p>
    </fieldset>
  );
}
