"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { FieldError } from "./FieldError";
import { SituationBadge } from "./SituationBadge";
import type { LookupResult, PickableBook } from "../types/pedagogical-reservation";

export interface BookMultiPickerProps {
  // Livros escolhidos, na ordem em que foram adicionados.
  selected: PickableBook[];
  onChange: (books: PickableBook[]) => void;
  // Busca no servidor (Server Action): título ou tombo. A tela não conhece o banco.
  search: (term: string) => Promise<LookupResult<PickableBook>>;
  // Limite de livros por solicitação (o servidor confere de novo).
  max: number;
  error?: string;
  disabled?: boolean;
}

const MIN_TERM = 2;
const DEBOUNCE_MS = 350;

type Outcome = { term: string; items: PickableBook[]; failed: boolean };

// Seletor de vários livros (Figma, card 0136): campo de busca, lista de resultados e os escolhidos como etiquetas
// removíveis. Busca só depois de uma pausa na digitação e descarta resposta antiga (quem digitou depois vale).
export function BookMultiPicker({ selected, onChange, search, max, error, disabled = false }: BookMultiPickerProps) {
  const inputId = useId();
  const listId = useId();
  const [term, setTerm] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const searchRef = useRef(search);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const clean = term.trim();
  const ready = clean.length >= MIN_TERM;

  useEffect(() => {
    if (!ready) return;
    let current = true;
    const timer = setTimeout(async () => {
      const result = await searchRef.current(clean).catch(() => null);
      if (!current) return;
      setOutcome(result && result.ok ? { term: clean, items: result.items, failed: false } : { term: clean, items: [], failed: true });
    }, DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [clean, ready]);

  const loading = ready && outcome?.term !== clean;
  const shown = ready && outcome?.term === clean ? outcome : null;
  const full = selected.length >= max;

  function add(book: PickableBook) {
    if (full || selected.some((item) => item.id === book.id)) return;
    onChange([...selected, book]);
    setTerm("");
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm leading-6 font-medium text-ink">
        Livros <span aria-hidden>*</span>
      </label>
      <div className="relative">
        <Search size={18} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
        <input
          id={inputId}
          type="search"
          value={term}
          disabled={disabled || full}
          maxLength={60}
          autoComplete="off"
          placeholder={full ? `Limite de ${max} livros atingido` : "Buscar livro por título ou tombo"}
          aria-describedby={error ? `${inputId}-error` : undefined}
          aria-invalid={error ? true : undefined}
          aria-controls={listId}
          onChange={(event) => setTerm(event.target.value)}
          className={`h-11 w-full rounded-md border bg-surface md:h-10 pr-4 pl-10 text-base text-ink placeholder:text-ink-muted focus:outline-2 disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-70 ${
            error ? "border-danger-700 focus:border-danger-700 focus:outline-danger-700" : "border-line focus:border-focus focus:outline-focus"
          }`}
        />
      </div>

      <div id={listId} aria-live="polite">
        {ready && (
          <div className="rounded-md border border-line bg-surface">
            {loading && <p className="px-3 py-2 text-sm text-ink-muted">Buscando…</p>}
            {shown?.failed && <p className="px-3 py-2 text-sm text-danger-700">Não foi possível buscar agora. Tente de novo.</p>}
            {shown && !shown.failed && shown.items.length === 0 && (
              <p className="px-3 py-2 text-sm text-ink-muted">Nenhum livro encontrado para “{clean}”.</p>
            )}
            {shown && !shown.failed && shown.items.length > 0 && (
              <ul className="divide-y divide-line">
                {shown.items.map((book) => {
                  const chosen = selected.some((item) => item.id === book.id);
                  return (
                    <li key={book.id}>
                      <button
                        type="button"
                        disabled={chosen || disabled}
                        onClick={() => add(book)}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left hover:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">{book.title}</span>
                          <span className="block truncate text-xs text-ink-muted">
                            {book.author} · Tombo {book.code}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <SituationBadge situation={book.situation} />
                          {chosen ? (
                            <span className="text-xs text-ink-muted">Escolhido</span>
                          ) : (
                            <Plus size={16} aria-label="Adicionar" className="text-brand" />
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <ul aria-label="Livros escolhidos" className="flex flex-wrap gap-2">
          {selected.map((book) => (
            <li key={book.id} className="flex max-w-full items-center gap-1 rounded-full bg-selected py-1 pr-1 pl-3 text-sm text-brand-ink">
              <span className="truncate">{book.title}</span>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remover ${book.title}`}
                onClick={() => onChange(selected.filter((item) => item.id !== book.id))}
                className="-my-2 flex size-11 shrink-0 md:my-0 md:size-6 cursor-pointer items-center justify-center rounded-full hover:bg-navy-100 focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed dark:hover:bg-navy-800"
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-muted">
        {selected.length} de {max} livros escolhidos.
      </p>
      {error && <FieldError id={`${inputId}-error`} message={error} />}
    </div>
  );
}
