import type { ReactNode } from "react";

export type BadgeTone = "success" | "info" | "warning" | "danger" | "neutral";

// Mesmas cores do SituationBadge: pastel no claro; no escuro, fundo translúcido com borda e texto claros (contraste legível).
const TONES: Record<BadgeTone, string> = {
  success: "bg-success-100 text-success-700 dark:bg-green-400/15 dark:text-green-300 dark:ring-1 dark:ring-inset dark:ring-green-400/40",
  info: "bg-info-100 text-info-700 dark:bg-sky-400/15 dark:text-sky-300 dark:ring-1 dark:ring-inset dark:ring-sky-400/40",
  warning: "bg-warning-100 text-warning-700 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-1 dark:ring-inset dark:ring-amber-400/40",
  danger: "bg-danger-100 text-danger-700 dark:bg-red-400/15 dark:text-red-300 dark:ring-1 dark:ring-inset dark:ring-red-400/40",
  neutral: "bg-subtle text-ink-muted",
};

export interface ToneBadgeProps {
  tone: BadgeTone;
  children: ReactNode;
}

// Etiqueta de status genérica (histórico, relatórios): quem usa escolhe o tom e escreve o texto.
export function ToneBadge({ tone, children }: ToneBadgeProps) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}
