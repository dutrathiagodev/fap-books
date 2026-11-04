"use client";

import type { LucideIcon } from "lucide-react";
import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

export interface TextFieldProps {
  id: string;
  label: string;
  name?: string;
  type?: "text" | "email" | "password" | "number" | "search";
  placeholder?: string;
  // Texto de ajuda abaixo do campo. Some quando há erro.
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  defaultValue?: string;
  autoComplete?: string;
  onChange?: (value: string) => void;
  leadingIcon?: LucideIcon;
  trailing?: ReactNode;
}

// Campo do design system (Figma, página Desing System): rótulo, ícones opcionais e legenda. No erro, borda e legenda ficam vermelhas.
export function TextField({
  id,
  label,
  name,
  type = "text",
  placeholder,
  hint,
  error,
  required = false,
  disabled = false,
  value,
  defaultValue,
  autoComplete,
  onChange,
  leadingIcon: Leading,
  trailing,
}: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      <div className="relative">
        {Leading && (
          <Leading
            size={18}
            strokeWidth={1.5}
            aria-hidden
            className={`pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 ${error ? "text-danger-700" : "text-ink-muted"}`}
          />
        )}
        <input
          id={id}
          name={name ?? id}
          type={type}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          value={value}
          defaultValue={value === undefined ? defaultValue : undefined}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          className={`h-12 w-full rounded-md border bg-surface text-base text-ink placeholder:text-ink-muted focus:outline-2 disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-70 ${
            Leading ? "pl-10" : "pl-4"
          } ${trailing ? "pr-12" : "pr-4"} ${
            error ? "border-danger-700 focus:border-danger-700 focus:outline-danger-700" : "border-line focus:border-focus focus:outline-focus"
          }`}
        />
        {trailing && <div className="absolute top-1/2 right-1 -translate-y-1/2">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1 text-xs text-danger-700">
          <CircleAlert size={12} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
