import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS = {
  primary: "bg-brand text-on-brand hover:bg-brand-hover",
  outline: "border border-line-strong bg-surface text-brand hover:bg-subtle",
} as const;

const SIZES = { default: "h-11 px-5", small: "h-11 px-3 md:h-9" } as const;

// Botão do balcão: "primary" (azul escuro) e "outline" (borda), 44 px ou 36 px (linha de tabela).
export function LoanButton({
  children,
  variant = "primary",
  size = "default",
  icon: Icon,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  icon?: LucideIcon;
  disabled?: boolean;
  // Nome completo para leitor de tela, quando o texto visível é igual em várias linhas.
  label?: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" disabled={disabled} aria-label={label} onClick={onClick} className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]}`}>
      {Icon && <Icon size={16} strokeWidth={1.5} aria-hidden />}
      {children}
    </button>
  );
}
