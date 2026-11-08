"use client";

import { useEffect, useRef } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

export interface ToastProps {
  message: string;
  tone?: "success" | "error";
  onClose: () => void;
  // Some sozinho depois deste tempo. Padrão: 6 s (tempo de ler uma frase curta).
  durationMs?: number;
}

const TONES = {
  success: { icon: CircleCheck, color: "text-success-700 dark:text-green-300", role: "status" },
  error: { icon: CircleAlert, color: "text-danger-700 dark:text-red-300", role: "alert" },
} as const;

// Aviso rápido no canto da tela (Figma, card 0144: "Baixa concluída"). O leitor de tela anuncia o texto e o X fecha antes.
export function Toast({ message, tone = "success", onClose, durationMs = 6000 }: ToastProps) {
  const { icon: Icon, color, role } = TONES[tone];
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // A mensagem nova reinicia a contagem.
  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs]);

  return (
    <div
      role={role}
      className="fixed right-4 bottom-4 left-4 z-50 flex items-start gap-3 rounded-lg border border-line bg-surface p-4 text-sm shadow-lg sm:left-auto sm:max-w-sm"
    >
      <Icon size={18} strokeWidth={1.5} aria-hidden className={`mt-0.5 shrink-0 ${color}`} />
      <p className="min-w-0 flex-1 text-ink">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar aviso"
        className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
      >
        <X size={14} strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}
