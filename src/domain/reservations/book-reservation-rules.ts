import { formatLoanDate } from "../loans/loan-rules";
import type { ReservationStatus } from "@/types/reservation";

// Fila de espera do livro indisponível (RF-13 e RF-20). Quem decide de verdade é o banco (reserve_book,
// promote_reservations); aqui ficam os textos e as contas simples que as telas repetem.

// Dias para retirar o livro depois que a reserva fica pronta. O banco usa o mesmo número (reservation_pickup_days()).
export const RESERVATION_PICKUP_DAYS = 2;

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  waiting: "Na fila",
  ready: "Pronta para retirada",
  fulfilled: "Retirada",
  cancelled: "Cancelada",
  expired: "Expirada",
};

// Reserva "ativa" = ocupa lugar na fila ou guarda um exemplar. Só ela pode ser cancelada.
export function isActiveReservation(status: ReservationStatus): boolean {
  return status === "waiting" || status === "ready";
}

// "Você é o 2º da fila" / "Você é o próximo da fila".
export function queuePositionSentence(position: number): string {
  return position <= 1 ? "Você é o próximo da fila." : `Você é o ${position}º da fila.`;
}

// "Fila de espera: 3 pessoas." (conta quem espera e quem já está com o exemplar guardado)
export function queueSizeSentence(size: number): string {
  if (size <= 0) return "Ninguém na fila de espera.";
  return size === 1 ? "1 pessoa na fila de espera." : `${size} pessoas na fila de espera.`;
}

// "Retire até 15/11/2026."
export function pickupDeadlineSentence(expiresAt: string | Date): string {
  return `Retire até ${formatLoanDate(new Date(expiresAt))}.`;
}

// Rótulo do botão de reservar: quem chega primeiro "solicita"; quem chega depois "entra na lista de espera" (Figma, card 0111).
export function reserveButtonLabel(queueSize: number): string {
  return queueSize > 0 ? "Entrar na lista de espera" : "Solicitar reserva";
}
