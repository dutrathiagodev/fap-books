import { Check } from "lucide-react";

export const LOAN_STEPS = ["Usuário", "Livro", "Resumo", "Confirmar", "Comprovante"] as const;

// Passos do empréstimo (Figma 6574-1330): concluído = verde com check, atual = azul escuro, próximo = vazado.
// "current" é o passo atual (1 a 5); com 6 todos aparecem concluídos (comprovante emitido).
// Usado no balcão (LOAN_STEPS) e, com "steps" e "label", na reserva pedagógica presencial (Figma 0138).
export function Stepper({
  current,
  steps = LOAN_STEPS,
  label: listLabel = "Passos do empréstimo",
}: {
  current: number;
  steps?: readonly string[];
  label?: string;
}) {
  return (
    <ol aria-label={listLabel} className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {steps.map((label, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;
        return (
          <li key={label} className="flex items-center gap-2 text-sm" aria-current={active ? "step" : undefined}>
            <span
              className={`flex size-6 items-center justify-center rounded-full border text-xs font-medium ${
                done
                  ? "border-success-700 bg-success-700 text-white"
                  : active
                    ? "border-brand bg-brand text-on-brand"
                    : "border-line-strong bg-surface text-ink-muted"
              }`}
            >
              {done ? <Check size={14} strokeWidth={2} aria-hidden /> : number}
            </span>
            <span className={active ? "font-medium text-ink" : "text-ink-muted"}>{label}</span>
            {number < steps.length && <span aria-hidden className="hidden h-px w-8 bg-line sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}
