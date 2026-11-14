"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { formatLoanDate } from "@/domain/loans/loan-rules";
import { GENERIC_RESERVATION_ERROR } from "@/domain/reservations/book-reservation-errors";
import { pickupDeadlineSentence, queueSizeSentence } from "@/domain/reservations/book-reservation-rules";
import { buildReservationReadyMessage, buildWhatsAppUrl } from "@/domain/whatsapp/whatsapp-link";
import type { QueueEntry, ReservationActionResult } from "@/types/reservation";
import { Button } from "./Button";

interface BookQueuePanelProps {
  bookTitle: string;
  entries: QueueEntry[];
  onCancel: (reservationId: string, idempotencyKey: string) => Promise<ReservationActionResult>;
  onExpire: (reservationId: string, idempotencyKey: string) => Promise<ReservationActionResult>;
}

// Fila do livro para a funcionária (detalhe do acervo): quem espera, por ordem de chegada, e quem já tem o exemplar
// guardado (com o prazo de retirada). Ela pode cancelar qualquer reserva, expirar a pronta que ninguém retirou e avisar
// a pessoa no WhatsApp. Cancelar ou expirar passa a vez para o próximo (o banco faz).
export function BookQueuePanel({ bookTitle, entries, onCancel, onExpire }: BookQueuePanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const keys = useRef(new Map<string, string>());

  function send(id: string, action: (id: string, key: string) => Promise<ReservationActionResult>) {
    setError(undefined);
    const tag = `${action === onCancel ? "c" : "e"}:${id}`;
    const key = keys.current.get(tag) ?? crypto.randomUUID();
    keys.current.set(tag, key);
    startTransition(async () => {
      const result = await action(id, key).catch(() => null);
      if (!result) return setError(GENERIC_RESERVATION_ERROR); // falha de rede: a mesma chave vale na nova tentativa
      keys.current.delete(tag);
      if (result.ok) router.refresh();
      else setError(result.message);
    });
  }

  return (
    <section aria-labelledby="queue-title" className="rounded-lg border border-line bg-surface p-6">
      <h2 id="queue-title" className="font-heading text-xl font-bold">
        Fila de espera
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{queueSizeSentence(entries.length)}</p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-700 dark:text-red-300">
          {error}
        </p>
      )}

      {entries.length > 0 && (
        <ol className="mt-4 flex flex-col divide-y divide-line">
          {entries.map((entry) => {
            const ready = entry.status === "ready";
            const whatsapp =
              ready && entry.expiresAt
                ? buildWhatsAppUrl(
                    entry.phone,
                    buildReservationReadyMessage({
                      userName: entry.userName,
                      bookTitle,
                      pickupUntil: formatLoanDate(new Date(entry.expiresAt)),
                    }),
                  )
                : null;
            return (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {ready ? "Pronta" : `${entry.position}º`} · {entry.userName}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {entry.registration ? `Matrícula ${entry.registration} · ` : ""}
                    {ready && entry.expiresAt
                      ? pickupDeadlineSentence(entry.expiresAt)
                      : `Entrou em ${formatLoanDate(new Date(entry.createdAt))}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ready &&
                    (whatsapp ? (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Avisar ${entry.userName} por WhatsApp (abre em uma nova aba)`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-btn-soft px-2.5 text-sm font-medium text-brand-ink transition-colors hover:bg-btn-soft-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus dark:text-navy-200"
                      >
                        <MessageCircle aria-hidden className="size-4" />
                        Avisar no WhatsApp
                      </a>
                    ) : (
                      <span className="self-center text-xs text-ink-muted">Sem telefone cadastrado</span>
                    ))}
                  {ready && (
                    <Button text="Expirar" variant="tertiary" size="small" fullWidth={false} disabled={pending} onClick={() => send(entry.id, onExpire)} />
                  )}
                  <Button text="Cancelar" variant="tertiary" size="small" fullWidth={false} disabled={pending} onClick={() => send(entry.id, onCancel)} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
