import { Bookmark } from "lucide-react";
import type { MyReservationStatus, MyReservationView } from "../types/student";
import { EmptyState } from "./EmptyState";
import { ToneBadge, type BadgeTone } from "./ToneBadge";

const TONES: Record<MyReservationStatus, BadgeTone> = { waiting: "warning", ready: "success", fulfilled: "info", cancelled: "neutral" };

// Minhas reservas (Figma, card 0216): livros que o aluno pediu quando estavam sem exemplar livre.
// Sem reservas, o estado vazio explica quando a reserva existe.
export function StudentReservationList({ reservations }: { reservations: MyReservationView[] }) {
  if (reservations.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Você não tem reservas"
        description="Quando um livro estiver sem exemplar livre, você poderá entrar na fila de espera dele. A reserva aparece aqui."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {reservations.map((reservation) => (
        <li key={reservation.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="break-words font-medium text-ink">{reservation.bookTitle}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Tombo {reservation.code} · Reservado em {reservation.requestedOn}
            </p>
            <p className="mt-2 text-sm text-ink">{reservation.hint}</p>
          </div>
          <ToneBadge tone={TONES[reservation.status]}>{reservation.statusLabel}</ToneBadge>
        </li>
      ))}
    </ul>
  );
}
