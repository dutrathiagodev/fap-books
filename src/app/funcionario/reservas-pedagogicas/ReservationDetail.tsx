import { TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { ReservationKindBadge, ReservationOriginBadge, ReservationStatusBadge } from "@/components/ReservationBadges";
import { ToneBadge } from "@/components/ToneBadge";
import { formatDays, queueHref } from "@/domain/pedagogical/reservation-rules";
import type { BookAvailability, QueueFilter, ReservationView } from "@/types/pedagogical-reservation";

// Painel de detalhe (Figma, card 0142): quem pediu, o período, a origem e a disponibilidade de cada livro, para a
// funcionária ver conflito antes de aprovar. Só contagens e datas, nunca o nome de quem está com o livro.
export function ReservationDetail({ reservation, availability, filter }: { reservation: ReservationView; availability: BookAvailability[]; filter: QueueFilter }) {
  const hasConflict = availability.some((item) => item.conflict) && reservation.status === "pending";
  return (
    <section aria-labelledby="detalhe-titulo" className="mt-6 rounded-lg border border-line bg-surface p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="detalhe-titulo" className="text-h3">
            Disponibilidade no período pedido
          </h2>
          <p className="text-sm text-ink-muted">
            {reservation.teacherName}, {reservation.startOn} a {reservation.endOn} · {formatDays(reservation.days)}
          </p>
        </div>
        <Link
          href={queueHref({ filter })}
          aria-label="Fechar detalhe"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          <X size={16} aria-hidden />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <ReservationStatusBadge status={reservation.status} />
        <ReservationOriginBadge inPerson={reservation.inPerson} />
        <ReservationKindBadge renewal={reservation.renewal} />
      </div>

      {hasConflict && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-warning-100 p-3 text-sm text-warning-700 dark:bg-amber-400/15 dark:text-amber-300">
          <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />
          Há livro sem exemplar livre agora: não dá para aprovar até um exemplar voltar. Você pode recusar com justificativa.
        </p>
      )}

      <ul className="mt-4 divide-y divide-line">
        {availability.map((item) => (
          <li key={item.bookId} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="min-w-0">
              <p className="font-medium text-ink">{item.title}</p>
              {item.conflict && item.nextReturnOn && <p className="text-xs text-ink-muted">Próxima devolução prevista em {item.nextReturnOn}</p>}
            </div>
            <ToneBadge tone={item.conflict ? "warning" : "success"}>
              {item.conflict ? "Conflito: sem exemplar livre" : `Disponível (${item.freeCopies} ${item.freeCopies === 1 ? "exemplar livre" : "exemplares livres"})`}
            </ToneBadge>
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {reservation.purpose && <Row term="Disciplina" value={reservation.purpose} />}
        <Row term="Solicitada em" value={reservation.requestedOn} />
        {reservation.decidedOn && <Row term="Decidida em" value={`${reservation.decidedOn}${reservation.decidedBy ? ` por ${reservation.decidedBy}` : ""}`} />}
        {reservation.decisionNote && <Row term="Justificativa" value={reservation.decisionNote} />}
        {reservation.returnedOn && <Row term="Devolvida em" value={reservation.returnedOn} />}
      </dl>
    </section>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-ink-muted">{term}:</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
