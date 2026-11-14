import { getCurrentProfile } from "@/services/profile.service";
import { inventoryTable, overdueTable, pedagogicalTable, toCsv, toPdf } from "@/domain/reports/report-export";
import { filtersText, parseExportFormat, parseReportFilters, REPORT_EXPORT_LIMIT } from "@/domain/reports/report-rules";
import { formatFineDate } from "@/domain/fines/fine-rules";
import { EXPORT_WINDOW, getInventoryReport, getOverdueReport, getPedagogicalReport } from "@/services/reports.service";
import type { ExportTable, ReportFilters } from "@/types/report";

// Exportação dos relatórios em CSV ou PDF (Figma, card 0156). Roda no servidor: o navegador só baixa o arquivo, então nenhum
// código de geração entra no pacote da tela. Mesmos filtros do endereço da tela, sem página; até REPORT_EXPORT_LIMIT linhas.
// O arquivo tem dados pessoais (nome e matrícula): só a bibliotecária baixa, nunca fica em cache e só um resumo vai para o log.

const NO_STORE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

async function buildTable(filters: ReportFilters): Promise<ExportTable> {
  const subtitle = filtersText(filters);
  if (filters.kind === "acervo") {
    const report = await getInventoryReport(EXPORT_WINDOW);
    return inventoryTable(report.rows, subtitle, Math.max(0, report.total - report.rows.length));
  }
  if (filters.kind === "reservas") {
    const report = await getPedagogicalReport(filters, EXPORT_WINDOW);
    return pedagogicalTable(report.rows, subtitle, Math.max(0, report.total - report.rows.length));
  }
  const report = await getOverdueReport(filters, EXPORT_WINDOW);
  return overdueTable(report.rows, subtitle, Math.max(0, report.total - report.rows.length));
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Faça login para baixar o relatório.", { status: 401, headers: NO_STORE });
  if (profile.role !== "librarian") return new Response("Só a bibliotecária baixa relatórios.", { status: 403, headers: NO_STORE });

  const url = new URL(request.url);
  const format = parseExportFormat(url.searchParams.get("formato"));
  if (!format) return new Response("Formato inválido: use csv ou pdf.", { status: 400, headers: NO_STORE });

  const filters = parseReportFilters(Object.fromEntries(url.searchParams));
  let table: ExportTable;
  try {
    table = await buildTable(filters);
  } catch {
    return new Response("Não foi possível gerar o relatório.", { status: 500, headers: NO_STORE });
  }

  // Só números e tipo no log (quem baixou, o quê e quantas linhas), nunca o conteúdo.
  console.info("Relatório exportado:", { by: profile.id, kind: filters.kind, format, rows: table.rows.length, limit: REPORT_EXPORT_LIMIT });

  const today = formatFineDate(new Date()).split("/").reverse().join("-");
  const filename = `relatorio-${filters.kind}-${today}.${format}`;
  const headers = { ...NO_STORE, "Content-Disposition": `attachment; filename="${filename}"` };

  if (format === "csv") {
    return new Response(toCsv(table), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
  }
  return new Response(toPdf(table, formatFineDate(new Date())) as BodyInit, { headers: { ...headers, "Content-Type": "application/pdf" } });
}
