"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { GENERIC_RESERVATION_ERROR } from "@/domain/reservations/book-reservation-errors";
import type { ReservationActionResult } from "@/types/reservation";
import type { MyReservationStatus, MyReservationView } from "../types/student";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { ToneBadge, type BadgeTone } from "./ToneBadge";

const TONES: Record<MyReservationStatus, BadgeTone> = { waiting: "warning", ready: "success", fulfilled: "info", cancelled: "neutral" };

interface StudentReservationListProps {
  reservations: MyReservationView[];
  // Server Action (a página entrega): sem ela a lista só mostra, sem o botão de cancelar.
  onCancel?: (reservationId: string, idempotencyKey: string) => Promise<ReservationActionResult>;
}

// Minhas reservas (Figma, card 0216): livros que o aluno pediu quando estavam sem exemplar livre.
// Reserva na fila ou pronta pode ser cancelada aqui (o banco passa a vez para o próximo da fila).
// Sem reservas, o estado vazio explica quando a reserva existe.
export function StudentReservationList({ reservations, onCancel }: StudentReservationListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  // Uma chave por tentativa: clique duplo ou nova tentativa depois de falha de rede registram uma vez só.
  const key = useRef<string>(null);

  function cancel(reservationId: string) {
    if (!onCancel) return;
    setError(undefined);
    key.current ??= crypto.randomUUID();
    const current = key.current;
    startTransition(async () => {
      const result = await onCancel(reservationId, current).catch(() => null);
      if (result?.ok) {
        key.current = null;
        router.refresh();
        return;
      }
      if (result) key.current = null;
      setError(result ? result.message : GENERIC_RESERVATION_ERROR);
    });
  }

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
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm text-danger-700 dark:text-red-300">
          {error}
        </p>
      )}
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
            <div className="flex flex-wrap items-center gap-3">
              <ToneBadge tone={TONES[reservation.status]}>{reservation.statusLabel}</ToneBadge>
              {onCancel && (reservation.status === "waiting" || reservation.status === "ready") && (
                <Button
                  text={pending ? "Cancelando..." : "Cancelar reserva"}
                  ariaLabel={`Cancelar reserva de ${reservation.bookTitle}`}
                  variant="secondary"
                  size="small"
                  fullWidth={false}
                  disabled={pending}
                  onClick={() => cancel(reservation.id)}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
