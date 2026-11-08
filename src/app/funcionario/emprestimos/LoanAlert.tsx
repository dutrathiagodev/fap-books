import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

export type LoanAlertTone = "info" | "danger" | "warning";

// Fundos pastel no claro e translúcidos com borda no escuro (como o SituationBadge): o texto usa "text-ink", que
// troca com o tema, então só o fundo precisa de variante escura. Vermelho: pastel com texto vermelho nos dois temas.
const TONES = {
  info: {
    box: "border-info-100 bg-info-100 text-ink dark:border-sky-400/40 dark:bg-sky-400/15",
    icon: Info,
    color: "text-info-700 dark:text-sky-300",
  },
  danger: {
    box: "border-danger-700 bg-danger-100 text-danger-700 dark:bg-red-400/15 dark:text-red-300",
    icon: TriangleAlert,
    color: "text-danger-700 dark:text-red-300",
  },
  warning: {
    box: "border-warning-100 bg-warning-100 text-ink dark:border-amber-400/40 dark:bg-amber-400/15",
    icon: CircleAlert,
    color: "text-warning-700 dark:text-amber-300",
  },
} as const;

// Alertas de limite e atraso do balcão (Figma, card 0133): informativo (azul), bloqueio (vermelho) e aviso (amarelo).
// Só desenha: a página escolhe o tom e escreve a frase. A ação (ex.: "Dar baixa na multa") entra à direita.
export function LoanAlert({ tone, children, action }: { tone: LoanAlertTone; children: ReactNode; action?: ReactNode }) {
  const { box, icon: Icon, color } = TONES[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${box}`}
    >
      <p className="flex min-w-0 items-start gap-2.5">
        <Icon size={18} strokeWidth={1.5} aria-hidden className={`mt-0.5 shrink-0 ${color}`} />
        <span>{children}</span>
      </p>
      {action}
    </div>
  );
}
