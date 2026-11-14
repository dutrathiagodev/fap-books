"use client";

import { useRef, useState, useTransition } from "react";
import { parseRenewalDays } from "@/domain/pedagogical/renewal-rules";
import type { ReservationActionResult } from "@/types/pedagogical-reservation";
import { Button } from "./Button";
import { TextField } from "./TextField";
import { Toast } from "./Toast";

interface RenewalRequestProps {
  reservationId: string;
  // Fim atual do período (dd/mm/aaaa), para a frase de confirmação.
  endOn: string;
  maxDays: number;
  // Server Action (a página entrega): este componente não fala com o banco.
  onRequest: (reservationId: string, days: string, idempotencyKey: string) => Promise<ReservationActionResult>;
}

// "Renovar reserva" (card 0055): o professor pede mais dias perto do fim do prazo; a funcionária aprova de novo. Usa os
// mesmos campos e botões da reserva pedagógica (sem frame próprio no Figma). A chave de idempotência vale até a ação terminar:
// clique duplo ou nova tentativa depois de falha de rede enviam a mesma chave e o banco registra uma vez só.
export function RenewalRequest({ reservationId, endOn, maxDays, onRequest }: RenewalRequestProps) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(String(Math.min(7, maxDays)));
  const [error, setError] = useState<string>();
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const key = useRef<string>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const parsed = parseRenewalDays(days, maxDays);
    if (!parsed.ok) return setError(parsed.message);
    setError(undefined);
    key.current ??= crypto.randomUUID();
    const current = key.current;
    startTransition(async () => {
      const result = await onRequest(reservationId, days, current).catch(() => null);
      if (!result) return setError("Não foi possível concluir agora. Confira a conexão e tente de novo.");
      if (!result.ok) {
        if (result.final) key.current = null;
        return setError(result.message);
      }
      key.current = null;
      setOpen(false);
      setToast("Pedido de renovação enviado. A funcionária da biblioteca vai analisar.");
    });
  }

  return (
    <>
      {!open ? (
        <Button text="Renovar reserva" variant="secondary" size="small" fullWidth={false} onClick={() => setOpen(true)} />
      ) : (
        <form onSubmit={submit} noValidate className="flex w-full flex-col gap-3 rounded-md border border-line p-3 sm:max-w-sm">
          <p className="text-sm text-ink-muted">A reserva termina em {endOn}. Quantos dias a mais você precisa? A funcionária precisa aprovar de novo.</p>
          <TextField
            id={`renovacao-${reservationId}`}
            label="Dias a mais"
            type="number"
            inputMode="numeric"
            required
            value={days}
            min={1}
            max={maxDays}
            hint={`Máximo de ${maxDays} dias por renovação`}
            disabled={pending}
            error={error}
            onChange={(value) => {
              setDays(value);
              setError(undefined);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button text={pending ? "Enviando…" : "Enviar pedido"} type="submit" size="small" fullWidth={false} loading={pending} />
            <Button text="Cancelar" variant="tertiary" size="small" fullWidth={false} disabled={pending} onClick={() => setOpen(false)} />
          </div>
        </form>
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
