"use client";

import { useRef, useState, useTransition } from "react";
import { FinePayModal } from "@/components/FinePayModal";
import { FinesTable } from "@/components/FinesTable";
import { Toast } from "@/components/Toast";
import type { FineView } from "@/types/fine";
import { payFineAction } from "./actions";

interface ToastState {
  message: string;
  tone: "success" | "error";
}

// Lista de multas com a baixa manual: abre o modal, chama a Server Action e avisa o resultado com um toast.
// Depois do sucesso a Server Action atualiza a rota e a linha passa a mostrar Paga, com quem registrou e quando.
export function FinesDesk({ fines }: { fines: FineView[] }) {
  const [selected, setSelected] = useState<FineView | null>(null);
  const [error, setError] = useState<string>();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pending, startTransition] = useTransition();
  // Uma chave de idempotência (uuid) por baixa: o clique duplo e a nova tentativa depois de falha de rede enviam a
  // MESMA chave e o banco registra uma vez só. Só muda ao abrir outra baixa ou depois de um erro de regra.
  const key = useRef<string | null>(null);

  function open(fine: FineView) {
    key.current = crypto.randomUUID();
    setError(undefined);
    setSelected(fine);
  }

  function confirm() {
    const fine = selected;
    if (!fine || pending) return;
    key.current ??= crypto.randomUUID();
    const idempotencyKey = key.current;
    setError(undefined);

    startTransition(async () => {
      const result = await payFineAction(fine.id, idempotencyKey).catch(() => null);
      if (!result) {
        setError("Não foi possível registrar o pagamento agora. Confira a conexão e tente de novo.");
        return;
      }
      if (!result.ok) {
        if (result.final) key.current = null;
        setError(result.message);
        return;
      }
      key.current = null;
      setSelected(null);
      setToast({ message: `Pagamento de ${fine.amountLabel} registrado. ${fine.userName} está liberado(a) para novos empréstimos.`, tone: "success" });
    });
  }

  return (
    <>
      <FinesTable fines={fines} onPay={open} disabled={pending} />
      <FinePayModal fine={selected} pending={pending} error={error} onConfirm={confirm} onClose={() => setSelected(null)} />
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  );
}
