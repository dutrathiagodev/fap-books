import Link from "next/link";
import type { HistoryCandidate } from "@/types/loan-history";

interface HistoryCandidatesProps {
  candidates: HistoryCandidate[];
  // Endereço de cada opção (escolher = abrir o histórico dela).
  hrefFor: (id: string) => string;
}

// Opções achadas pela busca: a bibliotecária escolhe uma para abrir o histórico.
export function HistoryCandidates({ candidates, hrefFor }: HistoryCandidatesProps) {
  return (
    <ul aria-label="Resultados da busca" className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {candidates.map((candidate) => (
        <li key={candidate.id}>
          <Link href={hrefFor(candidate.id)} className="flex flex-col gap-0.5 px-4 py-3 hover:bg-selected focus-visible:outline-2 focus-visible:outline-focus">
            <span className="font-medium">{candidate.title}</span>
            <span className="text-sm text-ink-muted">{candidate.detail}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
