"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { FieldError } from "@/components/FieldError";
import { Modal } from "@/components/Modal";
import { RejectReservationModal } from "@/components/RejectReservationModal";
import { ReservationKindBadge, ReservationOriginBadge, ReservationStatusBadge } from "@/components/ReservationBadges";
import { Toast } from "@/components/Toast";
import { bookTitlesSummary, formatDays, queueHref } from "@/domain/pedagogical/reservation-rules";
import type { QueueFilter, ReservationActionResult, ReservationView } from "@/types/pedagogical-reservation";
import { decideReservationAction, returnReservationAction } from "./actions";

interface ToastState {
  message: string;
  tone: "success" | "error";
}

type Pending = { kind: "reject" | "return"; reservation: ReservationView } | null;

// Fila da funcionária (Figma, card 0140): uma linha por solicitação, com Aprovar (único botão primário), Recusar
// (abre o modal com a justificativa obrigatória) e, nas aprovadas, Registrar devolução.
export function QueueDesk({ reservations, filter }: { reservations: ReservationView[]; filter: QueueFilter }) {
  const [dialog, setDialog] = useState<Pending>(null);
  const [error, setError] = useState<string>();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pending, startTransition] = useTransition();
  // Chave de idempotência por ação ("kind:id"): o clique duplo e a nova tentativa de rede enviam a MESMA chave.
  const keys = useRef(new Map<string, string>());

  function keyFor(slot: string): string {
    let key = keys.current.get(slot);
    if (!key) {
      key = crypto.randomUUID();
      keys.current.set(slot, key);
    }
    return key;
  }

  // Executa a ação, guarda a chave até o servidor responder e avisa o resultado. Erro de regra descarta a chave.
  function run(slot: string, call: (key: string) => Promise<ReservationActionResult>, successMessage: string, inModal: boolean) {
    if (pending) return;
    setError(undefined);
    startTransition(async () => {
      const result = await call(keyFor(slot)).catch(() => null);
      if (!result) {
        setError("Não foi possível concluir agora. Confira a conexão e tente de novo.");
        return;
      }
      if (!result.ok) {
        if (result.final) keys.current.delete(slot);
        setError(result.message);
        // Fora de um modal (Aprovar), o erro vira aviso na tela; nos modais ele aparece dentro deles.
        if (!inModal) setToast({ message: result.message, tone: "error" });
        return;
      }
      keys.current.delete(slot);
      setDialog(null);
      setToast({ message: successMessage, tone: "success" });
    });
  }

  function approve(reservation: ReservationView) {
    run(
      `approve:${reservation.id}`,
      (key) => decideReservationAction(reservation.id, true, "", key),
      reservation.renewal
        ? `Renovação de ${reservation.teacherName} aprovada. O prazo da reserva foi estendido até ${reservation.endOn}.`
        : `Solicitação de ${reservation.teacherName} aprovada. Os exemplares ficam guardados até a devolução.`,
      false,
    );
  }

  // Detalhes, Aprovar/Recusar (pendente) ou Registrar devolução (aprovada): os mesmos botões na tabela e nos cartões.
  const actionsOf = (reservation: ReservationView) => (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={queueHref({ filter, detail: reservation.id })}
        className="rounded-md px-3 py-2 text-sm font-medium text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-focus"
      >
        Detalhes
      </Link>
      {reservation.status === "pending" && (
        <>
          <Button text="Aprovar" size="small" fullWidth={false} disabled={pending} onClick={() => approve(reservation)} />
          <Button
            text="Recusar"
            variant="danger"
            size="small"
            fullWidth={false}
            disabled={pending}
            onClick={() => {
              setError(undefined);
              setDialog({ kind: "reject", reservation });
            }}
          />
        </>
      )}
      {reservation.status === "approved" && !reservation.renewal && (
        <Button
          text="Registrar devolução"
          variant="secondary"
          size="small"
          fullWidth={false}
          disabled={pending}
          onClick={() => {
            setError(undefined);
            setDialog({ kind: "return", reservation });
          }}
        />
      )}
    </div>
  );

  const justification = (reservation: ReservationView) =>
    reservation.status === "rejected" && reservation.decisionNote ? (
      <p className="mt-2 text-sm text-danger-700 dark:text-red-300">Justificativa: {reservation.decisionNote}</p>
    ) : null;

  return (
    <>
      {/* Computador (Figma 0140): tabela Professor, Livros, Período, Origem, Tipo e Ações. */}
      <div className="hidden overflow-hidden rounded-lg border border-line bg-surface lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-subtle text-ink">
            <tr>
              {["Professor", "Livros", "Período", "Origem", "Tipo", "Ações"].map((header) => (
                <th key={header} scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation.id} className="border-t border-line align-top hover:bg-selected">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{reservation.teacherName}</p>
                  <p className="text-xs text-ink-muted">Solicitada em {reservation.requestedOn}</p>
                </td>
                <td className="px-4 py-3 text-ink">
                  {bookTitlesSummary(reservation.books.map((book) => book.title))}
                  {justification(reservation)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="font-medium text-ink">{reservation.startOn}</p>
                  <p className="text-xs text-ink-muted">
                    a {reservation.endOn} ({formatDays(reservation.days)})
                  </p>
                </td>
                <td className="px-4 py-3"><ReservationOriginBadge inPerson={reservation.inPerson} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <ReservationKindBadge renewal={reservation.renewal} />
                    {filter !== "pending" && <ReservationStatusBadge status={reservation.status} />}
                  </div>
                </td>
                <td className="px-4 py-3">{actionsOf(reservation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 lg:hidden">
        {reservations.map((reservation) => (
          <li key={reservation.id} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
            <div className="flex min-w-0 items-start gap-3">
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-selected text-xs font-medium text-brand-ink">
                {reservation.teacherInitials}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-ink">{reservation.teacherName}</p>
                <p className="text-sm text-ink-muted">{bookTitlesSummary(reservation.books.map((book) => book.title))}</p>
                <p className="text-sm text-ink-muted">
                  {reservation.startOn} a {reservation.endOn} · {formatDays(reservation.days)} · solicitada em {reservation.requestedOn}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ReservationOriginBadge inPerson={reservation.inPerson} />
                  <ReservationKindBadge renewal={reservation.renewal} />
                  {filter !== "pending" && <ReservationStatusBadge status={reservation.status} />}
                </div>
                {justification(reservation)}
              </div>
            </div>
            {actionsOf(reservation)}
          </li>
        ))}
      </ul>

      <RejectReservationModal
        reservation={dialog?.kind === "reject" ? dialog.reservation : null}
        pending={pending}
        error={error}
        onClose={() => setDialog(null)}
        onConfirm={(note) => {
          if (dialog?.kind !== "reject") return;
          const { reservation } = dialog;
          run(
            `reject:${reservation.id}`,
            (key) => decideReservationAction(reservation.id, false, note, key),
            `Solicitação de ${reservation.teacherName} recusada. O professor verá a justificativa.`,
            true,
          );
        }}
      />

      <Modal
        open={dialog?.kind === "return"}
        title="Registrar devolução"
        description={
          dialog?.kind === "return"
            ? `Confirme só depois de receber de volta os livros de ${dialog.reservation.teacherName}. Os exemplares voltam a ficar disponíveis.`
            : undefined
        }
        confirmLabel={pending ? "Registrando…" : "Registrar devolução"}
        confirmDisabled={pending}
        onConfirm={() => {
          if (dialog?.kind !== "return") return;
          const { reservation } = dialog;
          run(
            `return:${reservation.id}`,
            (key) => returnReservationAction(reservation.id, key),
            `Devolução registrada. Os livros de ${reservation.teacherName} voltaram a ficar disponíveis.`,
            true,
          );
        }}
        onClose={() => {
          if (!pending) setDialog(null);
        }}
      >
        {error && dialog?.kind === "return" && <FieldError message={error} />}
      </Modal>

      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  );
}
