import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface ButtonProps {
  text: string;
  type?: "button" | "submit";
  disabled?: boolean;
  // Ícone depois do texto (ex.: seta de "Entrar no sistema").
  icon?: LucideIcon;
  // Com href vira um link (navega) com o mesmo visual de botão.
  href?: string;
  // "primary" é o azul navy da identidade; "light" é o botão branco usado sobre fundo navy (boas-vindas do celular).
  variant?: "primary" | "light";
}

const BASE =
  "flex h-12 w-full items-center justify-center gap-2 px-6 text-sm font-medium rounded-md cursor-pointer transition-colors";
const VARIANTS = {
  primary: "bg-brand text-on-brand hover:bg-brand-hover",
  light: "bg-white text-navy-900 hover:bg-navy-50",
} as const;

// Botão do FAP Books (Figma: 48 px de altura, cantos de 8 px).
export function Button({ text, type = "button", disabled = false, icon: Icon, href, variant = "primary" }: ButtonProps) {
  const className = `${BASE} ${VARIANTS[variant]} disabled:cursor-not-allowed disabled:opacity-70`;
  const content = (
    <>
      {text}
      {Icon && <Icon size={16} strokeWidth={1.5} aria-hidden />}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} className={className}>
      {content}
    </button>
  );
}
