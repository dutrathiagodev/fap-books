import { Banknote, BookCheck, BookOpen, CalendarClock, CircleCheck, CircleX, FileText, Hourglass, Library, TriangleAlert, Archive } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReportIndicator } from "@/types/report";
import { IndicatorCard } from "./IndicatorCard";

// Ícone de cada número (o rótulo é o que o relatório mostra).
const ICONS: Record<string, LucideIcon> = {
  "Empréstimos em atraso": TriangleAlert,
  "Multa estimada": Banknote,
  "Títulos ativos": Library,
  Exemplares: BookOpen,
  Disponíveis: BookCheck,
  Emprestados: CalendarClock,
  Reservados: Hourglass,
  Inativos: Archive,
  Solicitações: FileText,
  Aprovadas: CircleCheck,
  Recusadas: CircleX,
  Aguardando: Hourglass,
};

export interface ReportIndicatorsProps {
  indicators: ReportIndicator[];
  // Nome do grupo para o leitor de tela.
  label: string;
}

// Totais gerais do relatório (os mesmos cartões do painel, Figma card 0157), sempre do filtro inteiro e não só da página.
export function ReportIndicators({ indicators, label }: ReportIndicatorsProps) {
  return (
    <section aria-label={label} className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fit,minmax(10rem,13rem))]">
      {indicators.map((item) => (
        <IndicatorCard
          key={item.label}
          label={item.label}
          value={item.value}
          icon={ICONS[item.label] ?? FileText}
          tone={item.tone}
          description={`${item.label}: ${item.value}`}
        />
      ))}
    </section>
  );
}
