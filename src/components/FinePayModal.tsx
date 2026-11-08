"use client";

import { useState } from "react";
import { formatDays, receivedText } from "../domain/fines/fine-rules";
import type { FineView } from "../types/fine";
import { FieldError } from "./FieldError";
import { Modal } from "./Modal";

export interface FinePayModalProps {
  // A multa que vai receber a baixa; nula = modal fechado.
  fine: FineView | null;
  // Baixa em andamento: desliga o botão e o fechamento.
  pending?: boolean;
  // Erro da última tentativa (mostrado dentro do modal).
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}

const SUMMARY_ROWS = (fine: FineView): Array<[string, string]> => [
  ["Usuário", `${fine.userName} (${fine.registration})`],
  ["Livro", fine.bookTitle],
  ["Atraso", formatDays(fine.daysLate)],
  ["Valor a receber", fine.amountLabel],
];

// Conteúdo do modal. Fica à parte para o "recebi" voltar desmarcado a cada multa (o pai troca a "key").
function Body({ fine, pending, error, onConfirm, onClose }: FinePayModalProps & { fine: FineView }) {
  const [received, setReceived] = useState(false);
  const label = receivedText(fine.amountCents);

  return (
    <Modal
      open
      title="Dar baixa na multa"
      description="O pagamento é presencial: confirme só depois de receber o valor no balcão."
      confirmLabel={pending ? "Registrando…" : "Registrar pagamento"}
      confirmDisabled={!received || pending}
      onConfirm={onConfirm}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <dl className="flex flex-col gap-2 rounded-lg bg-subtle p-4 text-sm">
        {SUMMARY_ROWS(fine).map(([term, value]) => (
          <div key={term} className="flex justify-between gap-4">
            <dt className="text-ink-muted">{term}</dt>
            <dd className="text-right font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={received}
          disabled={pending}
          onChange={(event) => setReceived(event.target.checked)}
          className="size-4 cursor-pointer accent-brand"
        />
        {label}
      </label>
      {error && <FieldError message={error} className="mt-3" />}
    </Modal>
  );
}

// Modal da baixa manual (Figma, card 0146): resumo da multa, a confirmação "Recebi R$ X presencialmente" e o botão
// "Registrar pagamento", que só liga depois de marcar a confirmação.
export function FinePayModal(props: FinePayModalProps) {
  if (!props.fine) return null;
  return <Body key={props.fine.id} {...props} fine={props.fine} />;
}
