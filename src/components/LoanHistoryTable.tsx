import type { HistoryRowView, HistoryStatus, HistoryTab } from "@/types/loan-history";
import { DataTable, type DataTableColumn } from "./DataTable";
import { ToneBadge, type BadgeTone } from "./ToneBadge";

const STATUS_TONE: Record<HistoryStatus, BadgeTone> = {
  open: "info",
  overdue: "danger",
  returned: "success",
  returned_late: "warning",
};

export interface LoanHistoryTableProps {
  rows: HistoryRowView[];
  // Na consulta por usuário a primeira coluna é o livro; na consulta por livro, a pessoa.
  focus: HistoryTab;
  emptyLabel?: string;
}

function PersonCell({ row }: { row: HistoryRowView }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-selected text-xs font-medium text-brand-ink">
        {row.initials}
      </span>
      <div>
        <div className="font-medium">{row.userName}</div>
        <div className="text-xs text-ink-muted">Matrícula {row.registration}</div>
      </div>
    </div>
  );
}

function BookCell({ row }: { row: HistoryRowView }) {
  return (
    <div>
      <div className="font-medium">{row.bookTitle}</div>
      <div className="text-xs text-ink-muted">Tombo {row.code}</div>
    </div>
  );
}

// Datas em ordem de leitura: retirada, prazo e devolução ("—" enquanto o livro não voltou).
function ScheduleCell({ row }: { row: HistoryRowView }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-xs">
      <dt className="text-ink-muted">Retirada</dt>
      <dd>{row.borrowedOn}</dd>
      <dt className="text-ink-muted">Prazo</dt>
      <dd>{row.dueOn}</dd>
      <dt className="text-ink-muted">Devolução</dt>
      <dd>{row.returnedOn ?? "—"}</dd>
    </dl>
  );
}

function StatusCell({ row }: { row: HistoryRowView }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <ToneBadge tone={STATUS_TONE[row.status]}>{row.statusLabel}</ToneBadge>
      {row.daysLate > 0 && (
        <span className="text-xs text-ink-muted">
          {row.daysLate} {row.daysLate === 1 ? "dia" : "dias"} de atraso
        </span>
      )}
    </div>
  );
}

function FineCell({ row }: { row: HistoryRowView }) {
  return (
    <div>
      <div className={row.fineNote === "Em aberto" ? "font-medium text-danger-700" : ""}>{row.fineLabel}</div>
      {row.fineNote && <div className="text-xs text-ink-muted">{row.fineNote}</div>}
    </div>
  );
}

// Tabela cronológica do histórico (Figma, card 0149). Usa a DataTable do design system (no celular vira cartões).
export function LoanHistoryTable({ rows, focus, emptyLabel = "Sem empréstimos registrados" }: LoanHistoryTableProps) {
  const columns: DataTableColumn<HistoryRowView>[] = [
    focus === "usuario"
      ? { key: "book", header: "Livro", cell: (row) => <BookCell row={row} /> }
      : { key: "person", header: "Usuário", cell: (row) => <PersonCell row={row} /> },
    { key: "schedule", header: "Cronograma", cell: (row) => <ScheduleCell row={row} /> },
    { key: "renewals", header: "Renovações", cell: (row) => row.renewals },
    { key: "status", header: "Status", cell: (row) => <StatusCell row={row} /> },
    { key: "fine", header: "Multa", cell: (row) => <FineCell row={row} /> },
  ];
  return <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} emptyLabel={emptyLabel} />;
}
