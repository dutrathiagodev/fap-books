import { BookOpen, CalendarClock, Receipt } from "lucide-react";
import { IndicatorCard } from "./IndicatorCard";
import { STUDENT_FINES_PATH, STUDENT_LOANS_PATH } from "../domain/student/student-rules";
import type { StudentSummary } from "../types/student";

// Resumo do aluno (Figma, card 0214): livros com ele (de 3, ou 4 para formando), prazos e multa em aberto.
export function StudentSummaryCards({ summary }: { summary: StudentSummary }) {
  const nearDeadlines = summary.dueToday + summary.dueSoon;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <IndicatorCard
        label="Livros emprestados"
        value={`${summary.borrowed} de ${summary.limit}`}
        icon={BookOpen}
        href={STUDENT_LOANS_PATH}
        description={`${summary.borrowed} de ${summary.limit} livros emprestados. Restam ${summary.remaining}.`}
      />
      <IndicatorCard
        label="Prazos próximos ou atrasados"
        value={String(nearDeadlines + summary.overdue)}
        icon={CalendarClock}
        tone={summary.overdue > 0 ? "danger" : "default"}
        href={STUDENT_LOANS_PATH}
        description={`${nearDeadlines} vencem em até 2 dias e ${summary.overdue} estão atrasados.`}
      />
      <IndicatorCard
        label="Multa em aberto"
        value={summary.openFineLabel}
        icon={Receipt}
        tone={summary.openFineCents > 0 ? "danger" : "default"}
        href={STUDENT_FINES_PATH}
        description={`Multa em aberto: ${summary.openFineLabel}.`}
      />
    </div>
  );
}
