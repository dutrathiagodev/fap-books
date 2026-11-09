import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface IndicatorCardProps {
  // Rótulo curto em cima do número (ex.: "Emprestados").
  label: string;
  // Número (ou valor já formatado, como "R$ 37,00").
  value: string;
  icon: LucideIcon;
  // "danger" pinta o número de vermelho (atrasos). O ícone e o rótulo continuam neutros.
  tone?: "default" | "danger";
  // Com href o cartão inteiro vira link para a tela de detalhe do número.
  href?: string;
  // Leitura completa para o leitor de tela (ex.: "9 empréstimos atrasados"). Sem ela, lê rótulo e valor.
  description?: string;
}

// Cartão de indicador do painel (Figma, card 0157): rótulo de 12 px, ícone de 20 px no canto e número grande em Lora.
// Borda e sem sombra forte, como pede o frame.
export function IndicatorCard({ label, value, icon: Icon, tone = "default", href, description }: IndicatorCardProps) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2 text-xs text-ink-muted">
        {label}
        <Icon size={20} strokeWidth={1.5} aria-hidden />
      </span>
      <span className={`mt-2 block font-heading text-h2 font-semibold ${tone === "danger" ? "text-danger" : "text-ink"}`}>{value}</span>
    </>
  );
  const className = "block rounded-xl border border-line bg-surface p-4";

  if (!href) {
    return (
      <div className={className} role="group" aria-label={description}>
        {body}
      </div>
    );
  }
  return (
    <Link
      href={href}
      aria-label={description}
      className={`${className} transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
    >
      {body}
    </Link>
  );
}
