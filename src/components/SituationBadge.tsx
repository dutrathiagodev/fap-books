import type { BookSituation } from "@/types/book";

// No escuro (Figma, "Color (Escuro)") o selo vira fundo translúcido com borda e texto claros, no lugar do pastel do tema claro.
const SITUATION: Record<BookSituation, { label: string; className: string }> = {
  available: {
    label: "Disponível",
    className: "situation-available",
  },
  unavailable: {
    label: "Emprestado",
    className: "situation-unavailable",
  },
  reserved: {
    label: "Reservado",
    className: "situation-reserved",
  },
  inactive: { label: "Inativo", className: "bg-subtle text-ink-muted" },
};

// Etiqueta da situação do livro (Figma, cards 0113 e 0108): a mesma na tabela do acervo e no cartão da pesquisa.
export function SituationBadge({ situation }: { situation: BookSituation }) {
  const { label, className } = SITUATION[situation];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{label}</span>;
}
