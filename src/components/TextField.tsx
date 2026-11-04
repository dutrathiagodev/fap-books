import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { FieldError } from "./FieldError";

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
  // O asterisco do rótulo acompanha required; o login, por exemplo, não usa.
  requiredMark?: boolean;
  disabled?: boolean;
  value?: string;
  defaultValue?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "search" | "email";
  maxLength?: number;
  // Rótulo só para leitor de tela, quando a tela já explica o campo (ex.: barra de busca).
  hideLabel?: boolean;
  // Classes de posição do campo na tela (largura, coluna da grade). O visual vem do componente.
  className?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  leadingIcon?: LucideIcon;
  trailing?: ReactNode;
}

// Sem estado nem hooks: serve tanto em componente de servidor quanto de cliente.
// Campo do design system (Figma, página Desing System): 40 px de altura, rótulo de 24 px, 8 px de espaço, ícones opcionais e legenda. No erro, borda e legenda ficam vermelhas.
export function TextField({
  id,
  label,
  name,
  type = "text",
  placeholder,
  hint,
  error,
  required = false,
  requiredMark = true,
  disabled = false,
  value,
  defaultValue,
  autoComplete,
  inputMode,
  maxLength,
  hideLabel = false,
  className = "",
  onChange,
  onBlur,
  leadingIcon: Leading,
  trailing,
}: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm leading-6 font-medium text-ink"}>
        {label}
        {required && requiredMark && <span aria-hidden> *</span>}
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
          inputMode={inputMode}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          onBlur={onBlur}
          className={`h-10 w-full rounded-md border bg-surface text-base text-ink placeholder:text-ink-muted focus:outline-2 disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-70 ${
            Leading ? "pl-10" : "pl-4"
          } ${trailing ? "pr-12" : "pr-4"} ${
            error ? "border-danger-700 focus:border-danger-700 focus:outline-danger-700" : "border-line focus:border-focus focus:outline-focus"
          }`}
        />
        {trailing && <div className="absolute top-1/2 right-1 -translate-y-1/2">{trailing}</div>}
      </div>
      {error ? (
        <FieldError id={`${id}-error`} message={error} />
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
