"use server";

import { revalidatePath } from "next/cache";
import { parseLookupTerm } from "@/domain/loans/loan-lookup-rules";
import { isUuid, NEW_IN_PERSON_PATH, parseDecisionNote, parseReservationInput, QUEUE_PATH } from "@/domain/pedagogical/reservation-rules";
import { requireRole } from "@/lib/require-role";
import {
  decideReservation,
  registerInPersonReservation,
  returnReservation,
  searchBooksForReservation,
  searchTeachers,
} from "@/services/pedagogical-reservations.service";
import type {
  LookupResult,
  PickableBook,
  PickableTeacher,
  ReservationActionResult,
  ReservationSubmitPayload,
  ReservationSubmitResult,
} from "@/types/pedagogical-reservation";

// Toda Server Action confere de novo quem está logado (só a funcionária) e valida o que veio do navegador.
const INVALID_KEY: ReservationActionResult = { ok: false, message: "Ação inválida. Atualize a tela e tente de novo.", final: true };
const NOT_FOUND: ReservationActionResult = { ok: false, message: "Solicitação não encontrada. Atualize a tela e confira a fila.", final: true };

export async function searchTeachersAction(rawTerm: string): Promise<LookupResult<PickableTeacher>> {
  const profile = await requireRole("librarian");
  const parsed = parseLookupTerm(String(rawTerm));
  if (!parsed.ok) return parsed;
  try {
    return { ok: true, items: await searchTeachers(parsed.term, profile.id) };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export async function searchBooksAction(rawTerm: string): Promise<LookupResult<PickableBook>> {
  await requireRole("librarian");
  const parsed = parseLookupTerm(String(rawTerm));
  if (!parsed.ok) return parsed;
  try {
    return { ok: true, items: await searchBooksForReservation(parsed.term) };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export async function registerInPersonAction(payload: ReservationSubmitPayload, idempotencyKey: string): Promise<ReservationSubmitResult> {
  await requireRole("librarian");
  if (!isUuid(idempotencyKey)) return INVALID_KEY as ReservationSubmitResult;
  if (!isUuid(payload?.teacherId)) return { ok: false, message: "Busque e escolha o professor.", final: true, fieldErrors: { teacher: "Busque e escolha o professor." } };

  const parsed = parseReservationInput(payload);
  if (!parsed.ok) return { ok: false, message: "Confira os campos destacados.", final: true, fieldErrors: parsed.errors };

  const result = await registerInPersonReservation(payload.teacherId, parsed.values, idempotencyKey);
  if (result.ok) {
    revalidatePath(QUEUE_PATH);
    revalidatePath(NEW_IN_PERSON_PATH);
  }
  return result;
}

// Aprovar (nota opcional) ou recusar (justificativa obrigatória). O banco confere de novo e só aprova com exemplar livre.
export async function decideReservationAction(
  reservationId: string,
  approve: boolean,
  rawNote: string,
  idempotencyKey: string,
): Promise<ReservationActionResult> {
  await requireRole("librarian");
  if (!isUuid(reservationId)) return NOT_FOUND;
  if (!isUuid(idempotencyKey)) return INVALID_KEY;
  if (typeof approve !== "boolean") return INVALID_KEY;
  const note = parseDecisionNote(rawNote, !approve);
  if (!note.ok) return { ok: false, message: note.message, final: true };

  const result = await decideReservation(reservationId, approve, note.note, idempotencyKey);
  if (result.ok) revalidatePath(QUEUE_PATH);
  return result;
}

export async function returnReservationAction(reservationId: string, idempotencyKey: string): Promise<ReservationActionResult> {
  await requireRole("librarian");
  if (!isUuid(reservationId)) return NOT_FOUND;
  if (!isUuid(idempotencyKey)) return INVALID_KEY;

  const result = await returnReservation(reservationId, idempotencyKey);
  if (result.ok) revalidatePath(QUEUE_PATH);
  return result;
}
