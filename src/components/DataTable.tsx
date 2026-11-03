import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  // Mensagem quando não há linhas. O erro substitui o vazio.
  emptyLabel?: string;
  error?: string;
}

// Tabela do design system (Figma: Título, Autor, Status, Ações). No celular vira cartões.
export function DataTable<Row>({ columns, rows, rowKey, emptyLabel = "Nenhum registro.", error }: DataTableProps<Row>) {
  const failed = Boolean(error) && rows.length === 0;
  const showEmpty = !error && rows.length === 0;
  const frame = error ? "border-danger-700" : "border-line";

  return (
    <div>
      {error && rows.length > 0 && (
        <p role="alert" className="mb-3 flex items-start gap-1 text-xs text-danger-700">
          <CircleAlert size={12} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <div className={`hidden overflow-hidden rounded-lg border bg-surface md:block ${frame}`}>
        <table className="w-full text-left text-sm">
          <thead className="bg-subtle text-ink-muted">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-4 py-3 font-medium">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {failed ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-danger-700">
                  <span role="alert" className="inline-flex items-center justify-center gap-1">
                    <CircleAlert size={12} strokeWidth={1.5} aria-hidden />
                    {error}
                  </span>
                </td>
              </tr>
            ) : showEmpty ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-ink-muted">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="border-t border-line hover:bg-selected">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-4">
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {failed ? (
          <p role="alert" className={`flex items-center justify-center gap-1 rounded-lg border bg-surface px-4 py-8 text-center text-xs text-danger-700 ${frame}`}>
            <CircleAlert size={12} strokeWidth={1.5} aria-hidden />
            {error}
          </p>
        ) : showEmpty ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-8 text-center text-sm text-ink-muted">{emptyLabel}</p>
        ) : (
          rows.map((row) => (
            <article key={rowKey(row)} className={`rounded-lg border bg-surface px-4 ${frame}`}>
              {columns.map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-3 border-b border-line py-3 last:border-b-0">
                  <span className="text-xs font-medium text-ink-muted">{column.header}</span>
                  <span className="text-right text-sm">{column.cell(row)}</span>
                </div>
              ))}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
