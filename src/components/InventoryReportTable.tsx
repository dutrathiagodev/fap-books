import { formatNumber } from "@/domain/format";
import type { InventoryRowView } from "@/types/report";
import { DataTable, type DataTableColumn } from "./DataTable";

const count = (value: number) => formatNumber(value);

const COLUMNS: DataTableColumn<InventoryRowView>[] = [
  { key: "category", header: "Categoria", cell: (row) => <span className="font-medium">{row.category}</span> },
  { key: "titles", header: "Títulos", cell: (row) => count(row.titles) },
  { key: "copies", header: "Exemplares", cell: (row) => count(row.copies) },
  { key: "available", header: "Disponíveis", cell: (row) => count(row.available) },
  { key: "borrowed", header: "Emprestados", cell: (row) => count(row.borrowed) },
  { key: "held", header: "Reservados", cell: (row) => count(row.held) },
  {
    key: "inactive",
    header: "Inativos",
    cell: (row) => (row.inactiveTitles === 0 ? "—" : `${count(row.inactiveCopies)} (${count(row.inactiveTitles)} ${row.inactiveTitles === 1 ? "título" : "títulos"})`),
  },
];

// Tabela do relatório de acervo por categoria (Figma, card 0155).
export function InventoryReportTable({ rows }: { rows: InventoryRowView[] }) {
  return <DataTable columns={COLUMNS} rows={rows} rowKey={(row) => row.category} emptyLabel="O acervo ainda não tem livros." />;
}
