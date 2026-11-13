import type { ReservationBook, ReservationStatus, ReservationView } from "../../types/pedagogical-reservation";
import { initialsOf } from "../loans/loan-lookup-rules";
import { addDays, formatInstantDate, formatIsoDate } from "./reservation-rules";

// Uma linha como o Supabase devolve (colunas da reserva e os joins). Os nomes dos perfis chegam nulos quando o RLS
// esconde o perfil (o professor não lê o perfil de quem decidiu).
export interface ReservationRow {
  id: string;
  start_date: string;
  days: number;
  status: ReservationStatus;
  requested_in_person: boolean;
  renewal_of: string | null;
  purpose: string | null;
  decision_note: string | null;
  decided_at: string | null;
  returned_at: string | null;
  created_at: string;
  teacher: { full_name: string } | null;
  decider: { full_name: string } | null;
  pedagogical_reservation_books: Array<{ books: ReservationBook | null }>;
  // Só nas renovações: a reserva original, de onde vêm os livros (a renovação não tem livros próprios).
  original?: { pedagogical_reservation_books: Array<{ books: ReservationBook | null }> } | null;
}

export function toReservationView(row: ReservationRow): ReservationView {
  const teacherName = row.teacher?.full_name ?? "Professor";
  return {
    id: row.id,
    teacherName,
    teacherInitials: initialsOf(teacherName),
    books: [...row.pedagogical_reservation_books, ...(row.original?.pedagogical_reservation_books ?? [])]
      .map((item) => item.books)
      .filter((book): book is ReservationBook => book !== null)
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    status: row.status,
    inPerson: row.requested_in_person,
    renewal: row.renewal_of !== null,
    renewalOf: row.renewal_of,
    startOn: formatIsoDate(row.start_date),
    endOn: formatIsoDate(addDays(row.start_date, row.days)),
    endDate: addDays(row.start_date, row.days),
    days: row.days,
    requestedOn: formatInstantDate(row.created_at),
    purpose: row.purpose,
    decisionNote: row.decision_note,
    decidedBy: row.decider?.full_name ?? null,
    decidedOn: row.decided_at ? formatInstantDate(row.decided_at) : null,
    returnedOn: row.returned_at ? formatInstantDate(row.returned_at) : null,
  };
}
