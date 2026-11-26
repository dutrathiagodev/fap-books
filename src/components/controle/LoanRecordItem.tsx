import { Trash2 } from "lucide-react";
import { daysLate, formatLoanDate, lateText, statusOf, STATUS_LABELS } from "@/domain/loan-records/loan-record-rules";
import type { LoanRecord, LoanRecordStatus } from "@/types/loan-record";
import { Button } from "../Button";
import { ToneBadge, type BadgeTone } from "../ToneBadge";

const TONES: Record<LoanRecordStatus, BadgeTone> = { borrowed: "info", returned: "success", overdue: "danger" };
// Borda lateral colorida além do selo: o status não depende só da cor (o selo tem texto).
const EDGE: Record<LoanRecordStatus, string> = { borrowed: "border-l-brand", returned: "border-l-success-700", overdue: "border-l-danger-700" };

interface LoanRecordItemProps {
  record: LoanRecord;
  today: string;
  busy: boolean;
  onReturn: (record: LoanRecord) => void;
  onDelete: (record: LoanRecord) => void;
}

// Um empréstimo: dados do livro e do leitor, as duas datas, o selo de status (com os dias de atraso) e as ações.
export function LoanRecordItem({ record, today, busy, onReturn, onDelete }: LoanRecordItemProps) {
  const status = statusOf(record, today);
  return (
    <li className={`flex flex-col gap-3 rounded-xl border border-l-4 border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between ${EDGE[status]}`}>
      <div className="min-w-0">
        <p className="break-words font-medium text-ink">{record.bookTitle}</p>
        <p className="text-sm text-ink-muted">
          {record.author} · {record.category}
        </p>
        <p className="mt-1 text-sm text-ink">Leitor: {record.readerName}</p>
        <p className="mt-1 text-xs text-ink-muted">
          Emprestado em {formatLoanDate(record.loanedOn)} · Devolução prevista {formatLoanDate(record.dueOn)}
          {record.returnedOn && ` · Devolvido em ${formatLoanDate(record.returnedOn)}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ToneBadge tone={TONES[status]}>{STATUS_LABELS[status]}</ToneBadge>
        {status === "overdue" && <span className="text-sm font-medium text-danger-700 dark:text-red-300">{lateText(daysLate(record, today))}</span>}
        {!record.returnedOn && (
          <Button text="Marcar como devolvido" ariaLabel={`Marcar ${record.bookTitle} como devolvido`} variant="secondary" size="small" fullWidth={false} disabled={busy} onClick={() => onReturn(record)} />
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(record)}
          aria-label={`Excluir o empréstimo de ${record.bookTitle}`}
          title="Excluir"
          className="flex size-11 cursor-pointer items-center justify-center rounded-md border border-danger-100 bg-danger-100 text-danger-700 hover:bg-danger-700 hover:text-white focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 mouse:size-8"
        >
          <Trash2 size={16} aria-hidden />
        </button>
      </div>
    </li>
  );
}
