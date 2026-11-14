import { CircleCheck } from "lucide-react";
import type { MyFineView } from "../types/student";
import { EmptyState } from "./EmptyState";
import { FinePaymentNotice } from "./FinePaymentNotice";
import { ToneBadge } from "./ToneBadge";

// Minhas multas (Figma, card 0217): em aberto primeiro, pagas depois, e sempre o aviso do pagamento presencial.
export function StudentFineList({ fines }: { fines: MyFineView[] }) {
  const open = fines.filter((fine) => !fine.paid);
  return (
    <div className="flex flex-col gap-4">
      {open.length > 0 && <FinePaymentNotice />}
      {fines.length === 0 ? (
        <EmptyState icon={CircleCheck} title="Você não tem multas" description="Devolva os livros até o prazo para não ter multa de atraso." />
      ) : (
        <ul className="flex flex-col gap-3">
          {fines.map((fine) => (
            <li key={fine.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words font-medium text-ink">{fine.bookTitle}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Tombo {fine.code} · Prazo era {fine.dueOn} · {fine.daysLate} {fine.daysLate === 1 ? "dia" : "dias"} de atraso
                </p>
                {fine.paidOn && <p className="mt-1 text-xs text-ink-muted">Paga em {fine.paidOn}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-heading text-h3 font-semibold ${fine.paid ? "text-ink-muted" : "text-danger"}`}>{fine.amountLabel}</span>
                <ToneBadge tone={fine.paid ? "success" : "danger"}>{fine.paid ? "Paga" : "Em aberto"}</ToneBadge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
