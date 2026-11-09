"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { FieldError } from "./FieldError";
import type { LookupResult, PickableTeacher } from "../types/pedagogical-reservation";

export interface TeacherPickerProps {
  selected: PickableTeacher | null;
  onChange: (teacher: PickableTeacher | null) => void;
  search: (term: string) => Promise<LookupResult<PickableTeacher>>;
  error?: string;
  disabled?: boolean;
}

const MIN_TERM = 2;
const DEBOUNCE_MS = 350;

type Outcome = { term: string; items: PickableTeacher[]; failed: boolean };

// Passo 1 do registro no balcão (Figma, card 0138): buscar o professor por nome ou matrícula e escolher um.
// Professor não encontrado é um estado da tela (aviso embaixo do campo), não um erro.
export function TeacherPicker({ selected, onChange, search, error, disabled = false }: TeacherPickerProps) {
  const inputId = useId();
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

  if (selected) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm leading-6 font-medium text-ink">Professor</span>
        <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-selected text-xs font-medium text-brand">
              {selected.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{selected.name}</p>
              <p className="truncate text-xs text-ink-muted">
                Matrícula {selected.registration} · {selected.detail}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange(null);
              setTerm("");
            }}
            className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-sm text-ink-muted hover:bg-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed"
          >
            <X size={14} aria-hidden />
            Trocar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm leading-6 font-medium text-ink">
        Professor <span aria-hidden>*</span>
      </label>
      <div className="relative">
        <Search size={18} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
        <input
          id={inputId}
          type="search"
          value={term}
          disabled={disabled}
          maxLength={60}
          autoComplete="off"
          placeholder="Buscar professor por nome ou matrícula"
          aria-describedby={error ? `${inputId}-error` : undefined}
          aria-invalid={error ? true : undefined}
          onChange={(event) => setTerm(event.target.value)}
          className={`h-10 w-full rounded-md border bg-surface pr-4 pl-10 text-base text-ink placeholder:text-ink-muted focus:outline-2 disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-70 ${
            error ? "border-danger-700 focus:border-danger-700 focus:outline-danger-700" : "border-line focus:border-focus focus:outline-focus"
          }`}
        />
      </div>
      <div aria-live="polite">
        {ready && (
          <div className="rounded-md border border-line bg-surface">
            {loading && <p className="px-3 py-2 text-sm text-ink-muted">Buscando…</p>}
            {shown?.failed && <p className="px-3 py-2 text-sm text-danger-700">Não foi possível buscar agora. Tente de novo.</p>}
            {shown && !shown.failed && shown.items.length === 0 && (
              <p className="px-3 py-2 text-sm text-ink-muted">Professor não encontrado. Confira o nome ou a matrícula e se o cadastro está ativo.</p>
            )}
            {shown && !shown.failed && shown.items.length > 0 && (
              <ul className="divide-y divide-line">
                {shown.items.map((teacher) => (
                  <li key={teacher.id}>
                    <button
                      type="button"
                      onClick={() => onChange(teacher)}
                      className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                    >
                      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-selected text-xs font-medium text-brand">
                        {teacher.initials}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{teacher.name}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          Matrícula {teacher.registration} · {teacher.detail}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {error && <FieldError id={`${inputId}-error`} message={error} />}
    </div>
  );
}
