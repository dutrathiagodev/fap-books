import Link from "next/link";
import type { ReactNode } from "react";

interface TextLinkProps {
  href: string;
  children: ReactNode;
  // Só para ajustes de espaçamento do lugar onde o link aparece.
  className?: string;
}

// Link sublinhado de ação secundária ("Limpar busca", "Voltar ao login").
export function TextLink({ href, children, className }: TextLinkProps) {
  return (
    <Link href={href} className={`${className ? `${className} ` : ""}text-sm font-medium text-link underline`}>
      {children}
    </Link>
  );
}
