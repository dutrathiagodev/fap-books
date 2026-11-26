import { AlertTriangle, BookOpen, CheckCircle2, Library } from "lucide-react";
import { formatNumber } from "@/domain/format";
import type { LoanRecordSummary as Summary } from "@/types/loan-record";
import { IndicatorCard } from "../IndicatorCard";

// Resumo geral: total, emprestados (em aberto), devolvidos e atrasados. Os números vêm prontos de summarize(), que conta a
// lista a cada mudança; nada é digitado à mão.
export function LoanRecordSummary({ summary }: { summary: Summary }) {
  return (
    <section aria-label="Resumo dos empréstimos" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <IndicatorCard label="Total de empréstimos" value={formatNumber(summary.total)} icon={Library} />
      <IndicatorCard label="Emprestados (em aberto)" value={formatNumber(summary.open)} icon={BookOpen} />
      <IndicatorCard label="Devolvidos" value={formatNumber(summary.returned)} icon={CheckCircle2} />
      <IndicatorCard
        label="Atrasados"
        value={formatNumber(summary.overdue)}
        icon={AlertTriangle}
        tone={summary.overdue > 0 ? "danger" : "default"}
      />
    </section>
  );
}
