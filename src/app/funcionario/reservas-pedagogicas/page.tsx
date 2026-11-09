import { ClipboardList, Info } from "lucide-react";
import { EmptyState, PageHeader, Pagination } from "@/components";
import { Button } from "@/components/Button";
import { FilterChips } from "@/components/FilterChips";
import { RolePage } from "@/components/RolePage";
import {
  NEW_IN_PERSON_PATH,
  parseQueueFilters,
  QUEUE_FILTER_LABELS,
  QUEUE_FILTERS,
  queueHref,
  queueSummary,
} from "@/domain/pedagogical/reservation-rules";
import { getAvailability, getReservation, listQueue } from "@/services/pedagogical-reservations.service";
import type { QueueFilter } from "@/types/pedagogical-reservation";
import { QueueDesk } from "./QueueDesk";
import { ReservationDetail } from "./ReservationDetail";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reservas pedagógicas | FAP Books" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const EMPTY: Record<QueueFilter, { title: string; description: string }> = {
  pending: { title: "Nenhuma solicitação pendente", description: "Quando um professor pedir livros, a solicitação aparece aqui." },
  approved: { title: "Nenhuma reserva aprovada", description: "As reservas aprovadas, com os livros ainda fora da estante, aparecem aqui." },
  rejected: { title: "Nenhuma solicitação recusada", description: "As recusas, com a justificativa, aparecem aqui." },
  returned: { title: "Nenhuma reserva devolvida", description: "Quando você registrar a devolução dos livros, a reserva aparece aqui." },
};

// A fila lê os filtros do endereço (dado da requisição), por isso roda dentro do Suspense do RolePage.
async function QueueContent({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseQueueFilters(await searchParams);
  const list = await listQueue(filters);
  const first = list.total === 0 ? 0 : (list.page - 1) * list.pageSize + 1;

  // Detalhe: só abre se a solicitação existe (uuid inválido ou de outro lugar mostra a fila sem painel).
  const detail = filters.detail ? await getReservation(filters.detail) : null;
  const availability = detail ? await getAvailability(detail) : [];

  return (
    <>
      <PageHeader
        title="Reservas pedagógicas"
        breadcrumbs={[{ label: "Gestão bibliotecária" }, { label: "Reservas pedagógicas" }]}
        description="Aprove ou recuse as solicitações dos professores e registre a devolução dos livros."
        action={<Button text="Registrar solicitação presencial" href={NEW_IN_PERSON_PATH} variant="secondary" size="default" fullWidth={false} />}
      />

      <aside className="mb-6 flex items-start gap-3 rounded-lg border border-info-100 bg-info-100 p-4 text-sm text-ink dark:border-sky-400/40 dark:bg-sky-400/15">
        <Info size={18} aria-hidden className="mt-0.5 shrink-0 text-info-700 dark:text-sky-300" />
        <p>
          <strong className="font-medium">Regra de negócio.</strong> Ao aprovar, um exemplar de cada livro fica guardado para o professor até a
          devolução. O prazo máximo é de 30 dias e a decisão registra quem decidiu e quando.
        </p>
      </aside>

      <div className="mb-4">
        <FilterChips
          label="Filtrar solicitações"
          chips={QUEUE_FILTERS.map((filter) => ({
            label: QUEUE_FILTER_LABELS[filter],
            count: list.counts[filter],
            href: queueHref({ filter }),
            active: filters.filter === filter,
          }))}
        />
      </div>

      {list.reservations.length === 0 ? (
        <EmptyState icon={ClipboardList} {...EMPTY[filters.filter]} />
      ) : (
        <>
          <QueueDesk reservations={list.reservations} filter={filters.filter} />
          <Pagination
            page={list.page}
            pages={list.pages}
            summary={queueSummary(first, first + list.reservations.length - 1, list.total)}
            label="Páginas das solicitações"
            hrefFor={(target) => queueHref({ ...filters, page: target, detail: null })}
          />
        </>
      )}

      {detail && <ReservationDetail reservation={detail} availability={availability} filter={filters.filter} />}
    </>
  );
}

// Só a funcionária abre: o RolePage confere no servidor, além do proxy.ts.
export default function ReservasPedagogicasPage({ searchParams }: { searchParams: SearchParams }) {
  return <RolePage role="librarian">{() => <QueueContent searchParams={searchParams} />}</RolePage>;
}
