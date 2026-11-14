import { formatReais } from "@/domain/fines/fine-rules";
import type { OverdueRowView } from "@/types/report";
import { DataTable, type DataTableColumn } from "./DataTable";
import { ToneBadge } from "./ToneBadge";

const COLUMNS: DataTableColumn<OverdueRowView>[] = [
  {
    key: "user",
    header: "Usuário",
    cell: (row) => (
      <div>
        <div className="font-medium">{row.userName}</div>
        <div className="text-xs text-ink-muted">Matrícula {row.registration}</div>
      </div>
    ),
  },
  {
    key: "book",
    header: "Livro",
    cell: (row) => (
      <div>
        <div className="font-medium">{row.bookTitle}</div>
        <div className="text-xs text-ink-muted">Tombo {row.code}</div>
      </div>
    ),
  },
  { key: "due", header: "Prazo", cell: (row) => row.dueOn },
  {
    key: "situation",
    header: "Situação",
    cell: (row) => (row.returnedOn ? <ToneBadge tone="warning">Devolvido em {row.returnedOn}</ToneBadge> : <ToneBadge tone="danger">Em atraso</ToneBadge>),
  },
  { key: "days", header: "Dias de atraso", cell: (row) => `${row.daysLate} ${row.daysLate === 1 ? "dia" : "dias"}` },
  { key: "fine", header: "Multa estimada", cell: (row) => <span className="font-medium">{formatReais(row.fineCents)}</span> },
];

// Tabela do relatório de livros em atraso (Figma, card 0155). Usa a DataTable (no celular vira cartões).
export function OverdueReportTable({ rows }: { rows: OverdueRowView[] }) {
  return <DataTable columns={COLUMNS} rows={rows} rowKey={(row) => row.id} emptyLabel="Nenhum empréstimo em atraso." />;
}
