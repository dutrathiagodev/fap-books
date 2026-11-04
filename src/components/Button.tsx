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
  // primary, secondary e tertiary são as prioridades do Figma. light: branco sobre navy. danger: ação destrutiva. text: o "Editar" da tabela.
  variant?: "primary" | "light" | "secondary" | "tertiary" | "danger" | "text";
  // Tamanhos do Figma: large 48 px, default 42 px, small 32 px. Large é o padrão dos formulários.
  size?: "large" | "default" | "small";
  // Nos formulários o botão ocupa a linha. No modal ele abraça o texto, como no frame.
  fullWidth?: boolean;
  onClick?: () => void;
}

const COMMON =
  "items-center justify-center gap-2 text-sm font-medium cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50";

// Altura e respiro de cada tamanho (Figma: 18×12, 14×8 e 10×4).
const SIZES = {
  large: "h-12 px-4.5",
  default: "h-[42px] px-3.5",
  small: "h-8 px-2.5",
} as const;

// Cores por prioridade e estado (hover, pressed) lidas do componente Button do Figma.
const VARIANTS = {
  primary: "rounded-md bg-brand text-on-brand hover:bg-brand-hover active:bg-navy-950 dark:active:bg-navy-300",
  light: "rounded-md bg-white text-navy-900 hover:bg-navy-50",
  secondary: "rounded-md bg-btn-soft text-brand hover:bg-btn-soft-hover active:bg-navy-300",
  tertiary: "rounded-md text-ink-muted hover:bg-surface active:bg-subtle",
  danger: "rounded-md border border-danger-700 bg-danger-100 text-danger-700",
  // 32 px, como o botão de ícone da linha (a linha do frame tem 56 px). Fora dos tamanhos: ignora o size.
  text: "h-8 rounded-md px-2 text-link hover:underline",
} as const;

// Botão do FAP Books (Figma, card 0098: cantos de 8 px, três tamanhos e três prioridades).
export function Button({
  text,
  type = "button",
  disabled = false,
  loading = false,
  icon: Icon,
  href,
  variant = "primary",
  size = "large",
  fullWidth = true,
  onClick,
}: ButtonProps) {
  const layout = variant === "text" || !fullWidth ? "inline-flex" : "flex w-full";
  const sizing = variant === "text" ? "" : SIZES[size];
  const className = `${layout} ${COMMON} ${sizing} ${VARIANTS[variant]}`.replace(/\s+/g, " ");
  const content = (
    <>
      {text}
      {Icon && <Icon size={16} strokeWidth={1.5} aria-hidden />}
    </>
  );

  if (href) {
    if (disabled || loading) {
      return (
        <span aria-disabled="true" className={`${className} pointer-events-none opacity-50`}>
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
