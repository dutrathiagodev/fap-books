import type { BookSituation } from "@/types/book";

const SITUATION: Record<BookSituation, { label: string; className: string }> = {
  available: { label: "Disponível", className: "bg-success-100 text-success-700" },
  unavailable: { label: "Emprestado", className: "bg-info-100 text-info-700" },
  reserved: { label: "Reservado", className: "bg-warning-100 text-warning-700" },
  inactive: { label: "Inativo", className: "bg-subtle text-ink-muted" },
};

// Etiqueta da situação do livro (Figma, cards 0113 e 0108): a mesma na tabela do acervo e no cartão da pesquisa.
export function SituationBadge({ situation }: { situation: BookSituation }) {
  const { label, className } = SITUATION[situation];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{label}</span>;
}
