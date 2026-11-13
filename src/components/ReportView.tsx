import { EmptyState } from "./EmptyState";
import { Pagination } from "./Pagination";
import { TextLink } from "./TextLink";
import { DateRangeFilter } from "./DateRangeFilter";
import { FilterChips } from "./FilterChips";
import { ReportExportLinks } from "./ReportExportLinks";
import { ReportIndicators } from "./ReportIndicators";
import {
  OVERDUE_STATUS_OPTIONS,
  PEDAGOGICAL_STATUS_OPTIONS,
  REPORT_EXPORT_LIMIT,
  REPORTS_PATH,
  reportExportHref,
  reportHref,
  reportPeriodError,
  reportSummary,
} from "@/domain/reports/report-rules";
import type { ReactNode } from "react";
import type { ReportFilters, ReportPage } from "@/types/report";

// Tela de um relatório já consultado (Figma, card 0153): totais, filtros, exportação, tabela e paginação.
// Só desenha: quem consulta o banco é a página.
const NOUNS: Record<ReportFilters["kind"], [string, string]> = {
  atraso: ["empréstimo", "empréstimos"],
  acervo: ["categoria", "categorias"],
  reservas: ["reserva", "reservas"],
};

// Filtros do relatório: período (atraso e reservas) e situação. O acervo é um retrato de hoje e não filtra.
function ReportFiltersBar({ filters }: { filters: ReportFilters }) {
  if (filters.kind === "acervo") {
    return <p className="mb-4 text-sm text-ink-muted">Retrato do acervo de hoje: os números não têm período nem situação.</p>;
  }
  const options = filters.kind === "atraso" ? OVERDUE_STATUS_OPTIONS : PEDAGOGICAL_STATUS_OPTIONS;
  return (
    <div className="mb-4 flex flex-col gap-4">
      <DateRangeFilter
        action={REPORTS_PATH}
        hidden={{
          ...(filters.kind !== "atraso" ? { tipo: filters.kind } : {}),
          ...(filters.status !== (filters.kind === "atraso" ? "open" : "all") ? { situacao: filters.status } : {}),
        }}
        from={filters.from}
        to={filters.to}
        fromLabel={filters.kind === "atraso" ? "Prazo de" : "Pedido de"}
        error={reportPeriodError(filters)}
        clearHref={reportHref(filters, { from: null, to: null, page: 1 })}
      />
      <FilterChips
        label="Filtrar por situação"
        tone="solid"
        chips={options.map((item) => ({
          label: item.label,
          href: reportHref(filters, { status: item.value, page: 1 }),
          active: filters.status === item.value,
        }))}
      />
    </div>
  );
}

// Tabela, vazio e paginação de um relatório já consultado.
function ReportResult({ filters, report, table }: { filters: ReportFilters; report: ReportPage<unknown>; table: ReactNode }) {
  const pages = Math.max(1, Math.ceil(report.total / report.pageSize));
  const filtered = filters.status !== (filters.kind === "atraso" ? "open" : "all") || Boolean(filters.from || filters.to);
  if (report.rows.length === 0) {
    return (
      <EmptyState
        title={filters.kind === "atraso" ? "Nenhum empréstimo em atraso" : filters.kind === "acervo" ? "Acervo vazio" : "Nenhuma reserva encontrada"}
        description={
          filtered
            ? "Não há registros com esse filtro. Tente outro período ou situação."
            : filters.kind === "atraso"
              ? "Quando um livro passar do prazo, ele aparece aqui."
              : filters.kind === "acervo"
                ? "Cadastre livros no acervo para ver os totais por categoria."
                : "Quando um professor pedir uma reserva pedagógica, ela aparece aqui."
        }
        action={filtered ? <TextLink href={reportHref(filters, { from: null, to: null, status: filters.kind === "atraso" ? "open" : "all", page: 1 })}>Limpar filtros</TextLink> : undefined}
      />
    );
  }
  return (
    <>
      {table}
      <Pagination
        page={report.page}
        pages={pages}
        summary={reportSummary(report.page, report.pageSize, report.rows.length, report.total, NOUNS[filters.kind])}
        label="Páginas do relatório"
        hrefFor={(target) => reportHref(filters, { page: target })}
      />
    </>
  );
}

export function ReportView({ filters, report, table }: { filters: ReportFilters; report: ReportPage<unknown>; table: ReactNode }) {
  const exceeds = report.total > REPORT_EXPORT_LIMIT;
  return (
    <>
      <ReportIndicators indicators={report.indicators} label="Totais do relatório" />
      <ReportFiltersBar filters={filters} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {exceeds
            ? `A exportação traz as primeiras ${REPORT_EXPORT_LIMIT} linhas. Use o filtro para reduzir o resultado.`
            : "A exportação traz todas as linhas do filtro escolhido."}
        </p>
        <ReportExportLinks csvHref={reportExportHref(filters, "csv")} pdfHref={reportExportHref(filters, "pdf")} disabled={report.rows.length === 0} />
      </div>
      <ReportResult filters={filters} report={report} table={table} />
    </>
  );
}

