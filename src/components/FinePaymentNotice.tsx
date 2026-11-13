import { Info } from "lucide-react";
import { LIBRARY_PHONE_LABEL, LIBRARY_WHATSAPP_LABEL, OPENING_HOURS_TEXT } from "../domain/library/library-info";
import { FINE_PAYMENT_NOTICE } from "../domain/student/student-rules";
import { formatReais, FINE_PER_DAY_CENTS } from "../domain/loans/loan-rules";

// Aviso do pagamento presencial (Figma, card 0217): a multa é R$ 1,00 por dia corrido e só se paga na biblioteca.
export function FinePaymentNotice() {
  return (
    <aside role="note" className="flex items-start gap-3 rounded-lg border border-line bg-subtle px-4 py-3 text-sm text-ink">
      <Info size={18} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-info-700 dark:text-sky-300" />
      <div className="min-w-0">
        <p>
          {FINE_PAYMENT_NOTICE} A multa é de {formatReais(FINE_PER_DAY_CENTS)} por dia corrido de atraso.
        </p>
        <p className="mt-1 text-ink-muted">
          Contato da biblioteca: WhatsApp {LIBRARY_WHATSAPP_LABEL} ou telefone {LIBRARY_PHONE_LABEL}. {OPENING_HOURS_TEXT}
        </p>
      </div>
    </aside>
  );
}
