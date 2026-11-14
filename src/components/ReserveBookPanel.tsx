"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import {
  pickupDeadlineSentence,
  queuePositionSentence,
  queueSizeSentence,
  reserveButtonLabel,
} from "@/domain/reservations/book-reservation-rules";
import { GENERIC_RESERVATION_ERROR } from "@/domain/reservations/book-reservation-errors";
import type { BookSituation } from "@/types/book";
import type { BookReservationInfo, ReservationActionResult } from "@/types/reservation";
import { Button } from "./Button";

interface ReserveBookPanelProps {
  bookId: string;
  situation: BookSituation;
  info: BookReservationInfo | null;
  // Server Actions (a página entrega): este componente não fala com o banco.
  onReserve: (bookId: string, idempotencyKey: string) => Promise<ReservationActionResult>;
  onCancel: (reservationId: string, idempotencyKey: string) => Promise<ReservationActionResult>;
}

// Reservar um livro indisponível e acompanhar a fila (Figma, card 0111: "Solicitar reserva" e "Entrar na lista de espera").
// Livro com exemplar livre não tem botão: o empréstimo é no balcão. A chave de idempotência vale até a ação terminar:
// clique duplo ou nova tentativa depois de falha de rede enviam a mesma chave e o banco registra uma vez só.
export function ReserveBookPanel({ bookId, situation, info, onReserve, onCancel }: ReserveBookPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const key = useRef<string>(null);

  function send(action: (key: string) => Promise<ReservationActionResult>) {
    setError(undefined);
    key.current ??= crypto.randomUUID();
    const current = key.current;
    startTransition(async () => {
      const result = await action(current).catch(() => null);
      if (result?.ok) {
        key.current = null;
        router.refresh();
        return;
      }
      // Erro de regra: a próxima tentativa é outra ação (chave nova). Falha de rede: a mesma chave vale de novo.
      if (result) key.current = null;
      setError(result ? result.message : GENERIC_RESERVATION_ERROR);
    });
  }

  if (situation === "inactive") return null;

  const mine = info?.myReservationId && info.myStatus ? { id: info.myReservationId, status: info.myStatus } : null;
  const queueSize = info?.queueSize ?? 0;

  return (
    <div className="flex flex-col gap-3">
      {mine ? (
        <>
          <p role="status" className="rounded-md bg-selected px-4 py-3 text-sm text-ink">
            {mine.status === "ready" ? (
              <>
                <strong>Seu exemplar está guardado.</strong> {info?.myExpiresAt ? pickupDeadlineSentence(info.myExpiresAt) : ""} Procure o balcão da biblioteca.
              </>
            ) : (
              <>
                <strong>Você está na fila deste livro.</strong> {queuePositionSentence(info?.myPosition ?? 1)} Avisamos quando ele voltar.
              </>
            )}
          </p>
          <div>
            <Button
              text={pending ? "Cancelando..." : "Cancelar reserva"}
              variant="secondary"
              size="default"
              fullWidth={false}
              disabled={pending}
              onClick={() => send((k) => onCancel(mine.id, k))}
            />
          </div>
        </>
      ) : situation === "available" ? (
        <p className="text-sm text-ink-muted">Há exemplar livre: peça o empréstimo no balcão da biblioteca.</p>
      ) : (
        <>
          <div>
            <Button
              text={pending ? "Reservando..." : reserveButtonLabel(queueSize)}
              size="default"
              fullWidth={false}
              disabled={pending}
              onClick={() => send((k) => onReserve(bookId, k))}
            />
          </div>
          <p className="text-sm text-ink-muted">{queueSizeSentence(queueSize)}</p>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger-700 dark:text-red-300">
          {error}
        </p>
      )}

      <p className="flex items-center gap-2 text-xs text-ink-muted">
        <Info size={14} aria-hidden />
        Quando o livro voltar, a primeira pessoa da fila tem 2 dias para retirá-lo. Prazo de 7 dias corridos e máximo de 3 livros por usuário.
      </p>
    </div>
  );
}
