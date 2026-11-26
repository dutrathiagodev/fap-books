import { formatNumber } from "@/domain/format";
import type { TitleRowView } from "@/types/report";
import { DataTable, type DataTableColumn } from "./DataTable";

const count = (value: number) => formatNumber(value);

const COLUMNS: DataTableColumn<TitleRowView>[] = [
  { key: "title", header: "Título", cell: (row) => <span className="font-medium">{row.title}</span> },
  { key: "author", header: "Autor", cell: (row) => row.author },
  { key: "code", header: "Tombo", cell: (row) => row.code },
  { key: "category", header: "Categoria", cell: (row) => row.category },
  { key: "copies", header: "Exemplares", cell: (row) => count(row.copies) },
  { key: "available", header: "Disponíveis", cell: (row) => count(row.available) },
  { key: "borrowed", header: "Emprestados", cell: (row) => count(row.borrowed) },
  { key: "held", header: "Reservados", cell: (row) => count(row.held) },
];

// Tabela do relatório de acervo por título (card 0072): uma linha por livro ativo.
export function TitlesReportTable({ rows }: { rows: TitleRowView[] }) {
  return <DataTable columns={COLUMNS} rows={rows} rowKey={(row) => row.id} emptyLabel="O acervo ainda não tem livros." />;
}
