import Link from "next/link";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { STUDENT_LOANS_PATH, studentNoticeSentence } from "../domain/student/student-rules";
import type { MyLoanView, StudentSummary } from "../types/student";
import { DeadlineBadge } from "./DeadlineBadge";

// Avisos de prazo do aluno (Figma, card 0214): a frase de atenção e, embaixo, os livros que vencem em breve ou já venceram.
// Sem nada a avisar, a boa notícia em tom neutro.
export function StudentDeadlineNotice({ summary, loans }: { summary: StudentSummary; loans: MyLoanView[] }) {
  const sentence = studentNoticeSentence(summary);
  if (!sentence) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink">
        <CircleCheck size={18} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-success-700 dark:text-green-300" />
        <p>Nenhum prazo próximo ou atrasado.</p>
      </div>
    );
  }
  const urgent = loans.filter((loan) => loan.status !== null);
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-warning-100 bg-warning-100 px-4 py-3 text-sm text-ink dark:border-amber-400/40 dark:bg-amber-400/15"
    >
      <TriangleAlert size={18} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-warning-700 dark:text-amber-300" />
      <div className="min-w-0 flex-1">
        <p>{sentence}</p>
        <ul className="mt-2 flex flex-col gap-2">
          {urgent.map((loan) => (
            <li key={loan.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="min-w-0 break-words">
                {loan.bookTitle} · {loan.whenLabel}
              </span>
              {loan.status && <DeadlineBadge status={loan.status} />}
            </li>
          ))}
        </ul>
        <Link
          href={STUDENT_LOANS_PATH}
          className="mt-2 inline-flex min-h-11 items-center font-medium text-brand underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Ver meus empréstimos
        </Link>
      </div>
    </div>
  );
}
