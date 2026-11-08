import { CircleAlert, CircleCheck } from "lucide-react";

// Cores como as do SituationBadge: pastel no claro e translúcido com borda no escuro (contraste legível nos dois temas).
const STATUS = {
  open: {
    label: "Em aberto",
    icon: CircleAlert,
    className: "bg-danger-100 text-danger-700 dark:bg-red-400/15 dark:text-red-300 dark:ring-1 dark:ring-inset dark:ring-red-400/40",
  },
  paid: {
    label: "Paga",
    icon: CircleCheck,
    className: "bg-success-100 text-success-700 dark:bg-green-400/15 dark:text-green-300 dark:ring-1 dark:ring-inset dark:ring-green-400/40",
  },
} as const;

export interface FineStatusBadgeProps {
  paid: boolean;
}

// Etiqueta da situação da multa (Figma, card 0144): Em aberto (vermelho) ou Paga (verde), sempre com ícone,
// para a informação não depender só da cor.
export function FineStatusBadge({ paid }: FineStatusBadgeProps) {
  const { label, icon: Icon, className } = STATUS[paid ? "paid" : "open"];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${className}`}>
      <Icon size={12} strokeWidth={2} aria-hidden />
      {label}
    </span>
  );
}
