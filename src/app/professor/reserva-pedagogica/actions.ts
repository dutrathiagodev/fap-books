"use server";

import { revalidatePath } from "next/cache";
import { parseLookupTerm } from "@/domain/loans/loan-lookup-rules";
import { isUuid, parseReservationInput, TEACHER_RESERVATION_PATH, type ReservationInput } from "@/domain/pedagogical/reservation-rules";
import { parseRenewalDays } from "@/domain/pedagogical/renewal-rules";
import { requireRole } from "@/lib/require-role";
import { getPedagogicalMaxDays } from "@/services/library-settings.service";
import { requestRenewal, requestReservation, searchBooksForReservation } from "@/services/pedagogical-reservations.service";
import type { LookupResult, PickableBook, ReservationActionResult, ReservationSubmitResult } from "@/types/pedagogical-reservation";

// Server Action é uma porta pública: confere de novo quem está logado (só o professor) e valida o que veio do
// navegador. O servidor decide; a tela só pede.
export async function searchBooksAction(rawTerm: string): Promise<LookupResult<PickableBook>> {
  await requireRole("teacher");
  const parsed = parseLookupTerm(String(rawTerm));
  if (!parsed.ok) return parsed;
  try {
    return { ok: true, items: await searchBooksForReservation(parsed.term) };
  } catch {
    return { ok: false, reason: "error" };
  }
}

// A chave de idempotência (uuid) nasce na tela, uma por envio: o clique duplo e a nova tentativa de rede valem uma vez só.
export async function requestReservationAction(input: ReservationInput, idempotencyKey: string): Promise<ReservationSubmitResult> {
  await requireRole("teacher");
  if (!isUuid(idempotencyKey)) return { ok: false, message: "Ação inválida. Atualize a tela e tente de novo.", final: true };

  const parsed = parseReservationInput(input, undefined, await getPedagogicalMaxDays());
  if (!parsed.ok) {
    return { ok: false, message: "Confira os campos destacados.", final: true, fieldErrors: parsed.errors };
  }

  const result = await requestReservation(parsed.values, idempotencyKey);
  if (result.ok) revalidatePath(TEACHER_RESERVATION_PATH);
  return result;
}

// Pede a renovação de uma reserva aprovada (mais dias, com nova aprovação da funcionária). O banco confere o dono, a janela
// da última semana, o limite de dias, uma pendente por reserva e o teto de 365 dias. A chave de idempotência nasce na tela.
export async function requestRenewalAction(reservationId: string, rawDays: string, idempotencyKey: string): Promise<ReservationActionResult> {
  await requireRole("teacher");
  if (!isUuid(reservationId)) return { ok: false, message: "Reserva não encontrada. Atualize a tela.", final: true };
  if (!isUuid(idempotencyKey)) return { ok: false, message: "Ação inválida. Atualize a tela e tente de novo.", final: true };
  const days = parseRenewalDays(rawDays, await getPedagogicalMaxDays());
  if (!days.ok) return { ok: false, message: days.message, final: true };

  const result = await requestRenewal(reservationId, days.days, idempotencyKey);
  if (result.ok) revalidatePath(TEACHER_RESERVATION_PATH);
  return result;
}
