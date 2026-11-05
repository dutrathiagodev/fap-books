import type { BookSituation } from "@/types/book";

// No escuro (Figma, "Color (Escuro)") o selo vira fundo translúcido com borda e texto claros, no lugar do pastel do tema claro.
const SITUATION: Record<BookSituation, { label: string; className: string }> = {
  available: {
    label: "Disponível",
    className:
      "bg-success-100 text-success-700 dark:bg-green-400/15 dark:text-green-300 dark:ring-1 dark:ring-inset dark:ring-green-400/40",
  },
  unavailable: {
    label: "Emprestado",
    className:
      "bg-info-100 text-info-700 dark:bg-sky-400/15 dark:text-sky-300 dark:ring-1 dark:ring-inset dark:ring-sky-400/40",
  },
  reserved: {
    label: "Reservado",
    className:
      "bg-warning-100 text-warning-700 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-1 dark:ring-inset dark:ring-amber-400/40",
  },
  inactive: { label: "Inativo", className: "bg-subtle text-ink-muted" },
};

// Etiqueta da situação do livro (Figma, cards 0113 e 0108): a mesma na tabela do acervo e no cartão da pesquisa.
export function SituationBadge({ situation }: { situation: BookSituation }) {
  const { label, className } = SITUATION[situation];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{label}</span>;
}
