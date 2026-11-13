import Link from "next/link";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { bannerSentence, NOTICES_PATH } from "../domain/panel/panel-rules";
import type { PanelSummary } from "../types/panel";

// Faixa de avisos de prazo do painel (Figma, cards 0157 e 0148): resume quantos vencem em breve e quantos estão atrasados
// e leva para a lista completa. Sem nada a avisar, mostra a boa notícia em tom neutro.
export function DeadlineBanner({ summary }: { summary: Pick<PanelSummary, "dueToday" | "dueSoon" | "overdue"> }) {
  const sentence = bannerSentence(summary);

  if (!sentence) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink">
        <CircleCheck size={18} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-success-700 dark:text-green-300" />
        <p>Nenhum prazo próximo ou atrasado.</p>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-warning-100 bg-warning-100 px-4 py-3 text-sm text-ink dark:border-amber-400/40 dark:bg-amber-400/15"
    >
      <TriangleAlert size={18} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-warning-700 dark:text-amber-300" />
      <div className="min-w-0">
        <p>{sentence}</p>
        <Link
          href={NOTICES_PATH}
          className="mt-1 inline-flex min-h-11 items-center font-medium text-brand underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:min-h-0"
        >
          Ver avisos de prazo
        </Link>
      </div>
    </div>
  );
}
