import { PageHeader } from "@/components";
import { InventoryReportTable } from "@/components/InventoryReportTable";
import { LinkTabs } from "@/components/LinkTabs";
import { OverdueReportTable } from "@/components/OverdueReportTable";
import { PedagogicalReportTable } from "@/components/PedagogicalReportTable";
import { ReportView } from "@/components/ReportView";
import { RolePage } from "@/components/RolePage";
import { parseReportFilters, REPORT_KINDS, reportHref } from "@/domain/reports/report-rules";
import { getInventoryReport, getOverdueReport, getPedagogicalReport, pageWindow } from "@/services/reports.service";
import type { ReportFilters } from "@/types/report";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Relatórios | FAP Books" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function ReportBody({ filters }: { filters: ReportFilters }) {
  const window = pageWindow(filters.page);
  if (filters.kind === "acervo") {
    const report = await getInventoryReport(window);
    return <ReportView filters={filters} report={report} table={<InventoryReportTable rows={report.rows} />} />;
  }
  if (filters.kind === "reservas") {
    const report = await getPedagogicalReport(filters, window);
    return <ReportView filters={filters} report={report} table={<PedagogicalReportTable rows={report.rows} />} />;
  }
  const report = await getOverdueReport(filters, window);
  return <ReportView filters={filters} report={report} table={<OverdueReportTable rows={report.rows} />} />;
}

async function RelatoriosContent({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseReportFilters(await searchParams);
  const current = REPORT_KINDS.find((item) => item.kind === filters.kind) ?? REPORT_KINDS[0];

  return (
    <>
      <PageHeader
        title="Relatórios"
        breadcrumbs={[{ label: "Gestão bibliotecária" }, { label: "Relatórios" }]}
        description={current.description}
      />

      <div className="mb-6">
        <LinkTabs
          label="Tipo de relatório"
          tabs={REPORT_KINDS.map((item) => ({
            label: item.label,
            href: reportHref(filters, { kind: item.kind, from: null, to: null, status: item.kind === "atraso" ? "open" : "all", page: 1 }),
            active: filters.kind === item.kind,
          }))}
        />
      </div>

      <ReportBody filters={filters} />
    </>
  );
}

// Só a bibliotecária abre: o RolePage confere no servidor, além do proxy.ts (e as funções report_* do banco são a terceira barreira).
export default function RelatoriosPage({ searchParams }: { searchParams: SearchParams }) {
  return <RolePage role="librarian">{() => <RelatoriosContent searchParams={searchParams} />}</RolePage>;
}
