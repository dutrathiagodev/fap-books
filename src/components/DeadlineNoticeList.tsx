import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { DEADLINE_GROUP_TITLES, groupNotices, loanHref } from "../domain/panel/panel-rules";
import type { DeadlineNoticeView, DeadlineStatus } from "../types/panel";
import { DeadlineBadge } from "./DeadlineBadge";

const GROUP_ORDER: DeadlineStatus[] = ["soon", "today", "overdue"];

// Borda esquerda de 4 px na cor do estado (Figma, card 0147): âmbar para a vencer e hoje, vermelho para atrasado.
const EDGE: Record<DeadlineStatus, string> = {
  soon: "border-l-warning-700 dark:border-l-amber-300",
  today: "border-l-warning-700 dark:border-l-amber-300",
  overdue: "border-l-danger-700 dark:border-l-red-300",
};

function NoticeRow({ notice }: { notice: DeadlineNoticeView }) {
  return (
    <li className={`flex flex-col gap-3 rounded-lg border border-l-4 border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${EDGE[notice.status]}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{notice.userName}</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          {notice.bookTitle} · {notice.status === "overdue" ? "Venceu" : "Vence"} em {notice.dueOn}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2">
        <div className="sm:text-right">
          <p className={`text-sm ${notice.status === "overdue" ? "font-medium text-danger" : "text-ink"}`}>{notice.whenLabel}</p>
          <p className="text-xs text-ink-muted">{notice.fineLabel}</p>
        </div>
        <DeadlineBadge status={notice.status} />
        {notice.whatsappUrl ? (
          // Abre o WhatsApp com a mensagem pronta; quem envia é a funcionária (sem API e sem custo).
          <a
            href={notice.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Avisar ${notice.userName} por WhatsApp (abre em uma nova aba)`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-btn-soft px-2.5 text-sm font-medium text-brand-ink transition-colors hover:bg-btn-soft-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus dark:text-navy-200"
          >
            <MessageCircle aria-hidden className="size-4" />
            Avisar no WhatsApp
          </a>
        ) : (
          <span className="text-xs text-ink-muted">Sem telefone cadastrado</span>
        )}
        <Link
          href={loanHref(notice.code)}
          className="text-sm font-medium text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Ver empréstimo
        </Link>
      </div>
    </li>
  );
}

// Lista de avisos agrupada em A vencer, Vence hoje e Atrasado (Figma, cards 0147 e 0148). Mostra só os grupos que têm itens;
// quem trata a lista vazia é a página (estado vazio "Nenhum prazo próximo").
export function DeadlineNoticeList({ notices }: { notices: DeadlineNoticeView[] }) {
  const groups = groupNotices(notices);
  return (
    <div className="flex flex-col gap-6">
      {GROUP_ORDER.filter((status) => groups[status].length > 0).map((status) => (
        <section key={status} aria-labelledby={`avisos-${status}`}>
          <h2 id={`avisos-${status}`} className="mb-3 font-heading text-h3 font-semibold text-ink">
            {DEADLINE_GROUP_TITLES[status]}
          </h2>
          <ul className="flex flex-col gap-2">
            {groups[status].map((notice) => (
              <NoticeRow key={notice.id} notice={notice} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
