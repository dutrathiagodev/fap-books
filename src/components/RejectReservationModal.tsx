"use client";

import { useState } from "react";
import { MAX_NOTE_LENGTH, parseDecisionNote } from "../domain/pedagogical/reservation-rules";
import type { ReservationView } from "../types/pedagogical-reservation";
import { FieldError } from "./FieldError";
import { Modal } from "./Modal";

export interface RejectReservationModalProps {
  // A solicitação que vai ser recusada; nula = modal fechado.
  reservation: ReservationView | null;
  pending?: boolean;
  // Erro da última tentativa (vindo do servidor).
  error?: string;
  onConfirm: (note: string) => void;
  onClose: () => void;
}

// Conteúdo do modal. Fica à parte para o texto voltar vazio a cada solicitação (o pai troca a "key").
function Body({ reservation, pending, error, onConfirm, onClose }: RejectReservationModalProps & { reservation: ReservationView }) {
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<string>();

  function confirm() {
    const parsed = parseDecisionNote(note, true);
    if (!parsed.ok) {
      setFieldError(parsed.message);
      return;
    }
    setFieldError(undefined);
    onConfirm(parsed.note ?? "");
  }

  return (
    <Modal
      open
      title="Recusar solicitação"
      description={`Solicitação de ${reservation.teacherName}. O professor verá a justificativa.`}
      confirmLabel={pending ? "Recusando…" : "Recusar"}
      confirmVariant="danger"
      confirmDisabled={pending}
      onConfirm={confirm}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <label htmlFor="recusa-justificativa" className="text-sm leading-6 font-medium text-ink">
        Justificativa (obrigatória)
      </label>
      <textarea
        id="recusa-justificativa"
        value={note}
        rows={4}
        maxLength={MAX_NOTE_LENGTH}
        disabled={pending}
        aria-invalid={fieldError ? true : undefined}
        aria-describedby={fieldError ? "recusa-justificativa-erro" : undefined}
        onChange={(event) => setNote(event.target.value)}
        className={`mt-2 w-full resize-y rounded-md border bg-surface p-3 text-base text-ink placeholder:text-ink-muted focus:outline-2 disabled:cursor-not-allowed disabled:opacity-70 ${
          fieldError ? "border-danger-700 focus:outline-danger-700" : "border-line focus:border-focus focus:outline-focus"
        }`}
        placeholder="Ex.: sem exemplares disponíveis no período pedido."
      />
      <p className="mt-1 text-right text-xs text-ink-muted">
        {note.length}/{MAX_NOTE_LENGTH}
      </p>
      {fieldError && <FieldError id="recusa-justificativa-erro" message={fieldError} />}
      {error && <FieldError message={error} className="mt-2" />}
    </Modal>
  );
}

// Modal de recusa (Figma, card 0143): a justificativa é obrigatória e o botão "Recusar" é o perigo da tela.
export function RejectReservationModal(props: RejectReservationModalProps) {
  if (!props.reservation) return null;
  return <Body key={props.reservation.id} {...props} reservation={props.reservation} />;
}
