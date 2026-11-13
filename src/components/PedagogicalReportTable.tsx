import { bookListText } from "@/domain/reports/report-rules";
import type { PedagogicalRowView } from "@/types/report";
import { DataTable, type DataTableColumn } from "./DataTable";
import { ReservationStatusBadge } from "./ReservationBadges";

const COLUMNS: DataTableColumn<PedagogicalRowView>[] = [
  {
    key: "teacher",
    header: "Professor",
    cell: (row) => (
      <div>
        <div className="font-medium">{row.teacherName}</div>
        {row.purpose && <div className="text-xs text-ink-muted">{row.purpose}</div>}
      </div>
    ),
  },
  { key: "status", header: "Situação", cell: (row) => <ReservationStatusBadge status={row.status} /> },
  { key: "requested", header: "Pedido em", cell: (row) => row.requestedOn },
  {
    key: "period",
    header: "Período",
    cell: (row) => `${row.startOn} · ${row.days} ${row.days === 1 ? "dia" : "dias"}`,
  },
  { key: "books", header: "Livros", cell: (row) => <span className="text-sm">{bookListText(row.bookTitles, row.bookCount)}</span> },
];

// Tabela do relatório de reservas pedagógicas (Figma, card 0155).
export function PedagogicalReportTable({ rows }: { rows: PedagogicalRowView[] }) {
  return <DataTable columns={COLUMNS} rows={rows} rowKey={(row) => row.id} emptyLabel="Nenhuma reserva pedagógica." />;
}
