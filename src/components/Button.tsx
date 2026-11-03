import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface ButtonProps {
  text: string;
  type?: "button" | "submit";
  disabled?: boolean;
  // Trava o clique enquanto a ação acontece. O texto fica por conta de quem chama.
  loading?: boolean;
  // Ícone depois do texto (ex.: seta de "Entrar no sistema").
  icon?: LucideIcon;
  // Com href vira um link (navega) com o mesmo visual de botão.
  href?: string;
  // primary: navy. light: branco sobre navy. secondary: o "Cancelar" do modal. danger: ação destrutiva. text: o "Editar" da tabela.
  variant?: "primary" | "light" | "secondary" | "danger" | "text";
  // Nos formulários o botão ocupa a linha. No modal ele abraça o texto, como no frame.
  fullWidth?: boolean;
  onClick?: () => void;
}

const COMMON =
  "items-center justify-center gap-2 text-sm font-medium cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-70";

const VARIANTS = {
  primary: "h-12 rounded-md bg-brand px-6 text-on-brand hover:bg-brand-hover",
  light: "h-12 rounded-md bg-white px-6 text-navy-900 hover:bg-navy-50",
  secondary: "h-12 rounded-md bg-btn-soft px-6 text-brand hover:bg-btn-soft-hover",
  danger: "h-12 rounded-md border border-danger-700 bg-danger-100 px-6 text-danger-700",
  text: "text-link hover:underline",
} as const;

// Botão do FAP Books (Figma, card 0098: 48 px de altura, cantos de 8 px).
export function Button({
  text,
  type = "button",
  disabled = false,
  loading = false,
  icon: Icon,
  href,
  variant = "primary",
  fullWidth = true,
  onClick,
}: ButtonProps) {
  const layout = variant === "text" || !fullWidth ? "inline-flex" : "flex w-full";
  const className = `${layout} ${COMMON} ${VARIANTS[variant]}`;
  const content = (
    <>
      {text}
      {Icon && <Icon size={16} strokeWidth={1.5} aria-hidden />}
    </>
  );

  if (href) {
    if (disabled || loading) {
      return (
        <span aria-disabled="true" className={`${className} pointer-events-none opacity-70`}>
          {content}
        </span>
      );
    }
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} onClick={onClick} className={className}>
      {content}
    </button>
  );
}
