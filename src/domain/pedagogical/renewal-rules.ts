import type { ReservationView } from "../../types/pedagogical-reservation";
import { addDays, daysInvalidMessage, daysTooManyMessage, formatIsoDate, MIN_DAYS, todayInBrasilia } from "./reservation-rules";

// Renovação da reserva pedagógica (cards 0053 e 0055, RF-32): o professor pede mais dias perto do fim do prazo e a
// funcionária aprova de novo. Quem decide de verdade é o banco (request_pedagogical_renewal); aqui ficam as contas que a
// tela repete para mostrar o botão certo.

// Dias antes do fim em que o pedido já pode ser feito. O banco usa o mesmo número (renewal_window_days()).
export const RENEWAL_WINDOW_DAYS = 7;

export type RenewalState =
  | { kind: "none" }
  | { kind: "pending" }
  // Ainda fora da janela: opensOn é o primeiro dia em que dá para pedir (dd/mm/aaaa).
  | { kind: "too_early"; opensOn: string }
  | { kind: "open" };

// Situação da renovação de uma reserva do professor. "all" é a lista dele (a renovação pendente é uma linha da própria lista).
export function renewalStateOf(reservation: ReservationView, all: ReservationView[], today: string = todayInBrasilia()): RenewalState {
  if (reservation.status !== "approved" || reservation.renewal) return { kind: "none" };
  if (all.some((other) => other.renewalOf === reservation.id && other.status === "pending")) return { kind: "pending" };
  const opens = addDays(reservation.endDate, -RENEWAL_WINDOW_DAYS);
  if (today < opens) return { kind: "too_early", opensOn: formatIsoDate(opens) };
  return { kind: "open" };
}

// Dias da renovação digitados: inteiro de 1 ao limite do dia (configurável pela funcionária).
export function parseRenewalDays(raw: unknown, maxDays: number): { ok: true; days: number } | { ok: false; message: string } {
  const text = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : "";
  if (!/^\d{1,4}$/.test(text)) return { ok: false, message: daysInvalidMessage(maxDays) };
  const days = Number(text);
  if (days < MIN_DAYS) return { ok: false, message: daysInvalidMessage(maxDays) };
  if (days > maxDays) return { ok: false, message: daysTooManyMessage(maxDays) };
  return { ok: true, days };
}

// Novo fim do período se a renovação for aprovada: o novo período começa no fim atual (ou hoje, se o fim já passou).
export function renewedEndDate(currentEnd: string, days: number, today: string = todayInBrasilia()): string {
  return addDays(currentEnd > today ? currentEnd : today, days);
}
