import { Download, FileText } from "lucide-react";

export interface ReportExportLinksProps {
  csvHref: string;
  pdfHref: string;
  // Sem linhas, não há o que exportar: os botões ficam desativados.
  disabled?: boolean;
}

const BUTTON =
  "inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// Exportação do relatório (Figma, card 0156): CSV e PDF. São links comuns para a rota de servidor, então a tela
// não carrega código de geração de arquivo e o navegador baixa o arquivo direto.
export function ReportExportLinks({ csvHref, pdfHref, disabled = false }: ReportExportLinksProps) {
  if (disabled) {
    const off = `${BUTTON} cursor-not-allowed opacity-50 hover:bg-surface`;
    return (
      <div className="flex gap-2" role="group" aria-label="Exportar relatório">
        <span aria-disabled="true" className={off}>
          <Download size={16} aria-hidden /> CSV
        </span>
        <span aria-disabled="true" className={off}>
          <FileText size={16} aria-hidden /> PDF
        </span>
      </div>
    );
  }
  return (
    <div className="flex gap-2" role="group" aria-label="Exportar relatório">
      <a href={csvHref} download className={BUTTON}>
        <Download size={16} aria-hidden /> CSV
      </a>
      <a href={pdfHref} download className={BUTTON}>
        <FileText size={16} aria-hidden /> PDF
      </a>
    </div>
  );
}
