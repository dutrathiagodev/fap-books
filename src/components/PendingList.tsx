import Link from "next/link";
import { CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { ToneBadge } from "./ToneBadge";
import { EmptyState } from "./EmptyState";
import type { PendingItem } from "../types/panel";

export interface PendingListProps {
  items: PendingItem[];
  // Ação do estado vazio (ex.: botão "Novo empréstimo").
  emptyAction?: ReactNode;
  // Link do cabeçalho para a lista completa (ex.: "Ver todos os avisos").
  moreHref?: string;
  moreLabel?: string;
}

// Lista "Pendências de hoje" (Figma, card 0160): reservas pedagógicas aguardando, devoluções de hoje e atrasos.
// Cada linha tem título, detalhe, selo de status e o link para resolver. Sem itens, mostra o estado vazio do frame.
export function PendingList({ items, emptyAction, moreHref, moreLabel = "Ver todos os avisos" }: PendingListProps) {
  if (items.length === 0) {
    return (
      <EmptyState icon={CircleCheck} title="Nenhuma pendência hoje" description="Tudo em dia na biblioteca." action={emptyAction} />
    );
  }

  return (
    <section aria-labelledby="pendencias-titulo" className="overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
        <h2 id="pendencias-titulo" className="font-heading text-h3 font-semibold text-ink">
          Pendências de hoje
        </h2>
        {moreHref && (
          <Link href={moreHref} className="inline-flex min-h-11 items-center text-sm font-medium text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:min-h-0">
            {moreLabel}
          </Link>
        )}
      </header>
      <ul className="divide-y divide-line border-t border-line">
        {items.map((item) => (
          <li key={item.key} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{item.title}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{item.detail}</p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <ToneBadge tone={item.tone}>
                <span aria-hidden>• </span>
                {item.badge}
              </ToneBadge>
              <Link
                href={item.href}
                className="inline-flex min-h-11 items-center text-sm font-medium text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:min-h-0"
              >
                {item.actionLabel}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
