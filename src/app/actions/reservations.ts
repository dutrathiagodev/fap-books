"use server";

import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/domain/access/access-rules";
import { isUuid } from "@/domain/books/book-rules";
import { requireRole } from "@/lib/require-role";
import { getCurrentProfile } from "@/services/profile.service";
import { cancelReservation, expireReservation, reserveBook } from "@/services/reservations.service";
import type { ReservationActionResult } from "@/types/reservation";

// Server Actions da fila de espera (cards 0044 e 0045). Toda ação confere de novo quem está logado e valida o que veio do
// navegador (Server Action é uma porta pública); a regra e a permissão de verdade ficam no banco.
// A chave de idempotência (uuid) nasce na tela, uma por ação: clique duplo e nova tentativa de rede valem uma vez só.

const INVALID: ReservationActionResult = { ok: false, message: "Ação inválida. Atualize a tela e tente de novo." };

function validIds(id: unknown, key: unknown): boolean {
  return typeof id === "string" && typeof key === "string" && isUuid(id) && isUuid(key);
}

// Aluno e professor reservam para si. A funcionária consulta a fila, não reserva pela tela do livro.
export async function reserveBookAction(bookId: string, idempotencyKey: string): Promise<ReservationActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(LOGIN_PATH);
  if (profile.role === "librarian") return { ok: false, message: "Você não tem permissão para esta ação." };
  if (!validIds(bookId, idempotencyKey)) return INVALID;
  return reserveBook(bookId, idempotencyKey);
}

// A própria pessoa cancela a sua (o banco confere a dona) e a funcionária cancela qualquer uma.
export async function cancelReservationAction(reservationId: string, idempotencyKey: string): Promise<ReservationActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(LOGIN_PATH);
  if (!validIds(reservationId, idempotencyKey)) return INVALID;
  return cancelReservation(reservationId, idempotencyKey);
}

// Só a funcionária: reserva pronta que ninguém retirou.
export async function expireReservationAction(reservationId: string, idempotencyKey: string): Promise<ReservationActionResult> {
  await requireRole("librarian");
  if (!validIds(reservationId, idempotencyKey)) return INVALID;
  return expireReservation(reservationId, idempotencyKey);
}
