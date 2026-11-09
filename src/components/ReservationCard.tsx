import type { ReactNode } from "react";
import { formatDays } from "../domain/pedagogical/reservation-rules";
import type { ReservationView } from "../types/pedagogical-reservation";
import { ReservationStatusBadge } from "./ReservationBadges";

export interface ReservationCardProps {
  reservation: ReservationView;
  // Botões do cartão (ex.: nenhum para o professor; a fila tem os seus).
  actions?: ReactNode;
}

// Cartão de "Minhas reservas pedagógicas" (Figma, card 0135): livros, período, situação e, na recusa, a justificativa.
export function ReservationCard({ reservation, actions }: ReservationCardProps) {
  const { books, status } = reservation;
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-ink">{books.map((book) => book.title).join(", ") || "Livros"}</h3>
          <p className="text-sm text-ink-muted">
            {reservation.startOn} a {reservation.endOn} · {formatDays(reservation.days)}
          </p>
          {reservation.purpose && <p className="text-sm text-ink-muted">Disciplina: {reservation.purpose}</p>}
          <p className="text-xs text-ink-muted">Solicitada em {reservation.requestedOn}{reservation.inPerson ? " (no balcão)" : ""}</p>
        </div>
        <ReservationStatusBadge status={status} />
      </div>

      {status === "rejected" && reservation.decisionNote && (
        <p className="text-sm text-danger-700 dark:text-red-300">
          <strong className="font-medium">Justificativa:</strong> {reservation.decisionNote}
        </p>
      )}
      {status === "approved" && (
        <p className="text-sm text-ink-muted">Aprovada em {reservation.decidedOn}. Retire os livros na biblioteca e devolva até {reservation.endOn}.</p>
      )}
      {status === "returned" && <p className="text-sm text-ink-muted">Devolvida em {reservation.returnedOn}.</p>}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </li>
  );
}
