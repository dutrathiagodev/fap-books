import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { escapeLike, initialsOf, LOOKUP_MAX_RESULTS } from "@/domain/loans/loan-lookup-rules";
import { isFinalReservationError, reservationErrorCode, reservationErrorMessage } from "@/domain/pedagogical/reservation-errors";
import { addDays, formatIsoDate, todayInBrasilia, type ReservationValues } from "@/domain/pedagogical/reservation-rules";
import { toReservationView, type ReservationRow } from "@/domain/pedagogical/reservation-views";
import type {
  BookAvailability,
  PickableBook,
  PickableTeacher,
  QueueCounts,
  QueueFilters,
  QueueFilter,
  QueueList,
  ReservationActionResult,
  ReservationView,
} from "@/types/pedagogical-reservation";
import { recordAudit } from "./audit.service";
import { shelfByBook, shelfStatus, type ShelfRow } from "./book-shelf";

const PAGE_SIZE = 10;
// Tetos das leituras (regra do plano gratuito: toda consulta tem limite explícito).
const MY_RESERVATIONS_LIMIT = 50;
const AVAILABILITY_LIMIT = 1000;

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// Colunas da solicitação com o professor, quem decidiu e os livros. O professor não lê o perfil de quem decidiu (RLS):
// o nome vem nulo e a tela mostra só a justificativa.
const RESERVATION_COLUMNS =
  "id, start_date, days, status, requested_in_person, renewal_of, purpose, decision_note, decided_at, returned_at, created_at, " +
  "teacher:profiles!pedagogical_reservations_teacher_id_fkey(full_name), " +
  "decider:profiles!pedagogical_reservations_decided_by_fkey(full_name), " +
  "pedagogical_reservation_books(books(id, title, code)), " +
  // A renovação não tem livros próprios: os da reserva original. A tabela aponta para ela mesma, então a dica é o NOME DA
  // COLUNA (`!renewal_of`): com o nome da constraint o PostgREST responde PGRST200 e as telas da reserva pedagógica quebram.
  "original:pedagogical_reservations!renewal_of(pedagogical_reservation_books(books(id, title, code)))";

// Exportada só para o teste que impede a volta da dica pelo nome da constraint.
export const RESERVATION_COLUMNS_FOR_TEST = RESERVATION_COLUMNS;

// ---- Buscas dos formulários ----

interface BookRow {
  id: string;
  title: string;
  author: string;
  code: string;
  quantity: number;
}

// Livros ativos pelo título (contém) ou pelo tombo (começa com). Cada coluna vai à parte com .ilike(): o texto digitado
// é parâmetro, nunca vai dentro de um filtro .or. A situação vem de book_availability (só contagens, nunca pessoas).
export async function searchBooksForReservation(term: string): Promise<PickableBook[]> {
  await connection();
  const supabase = await createSupabaseServerClient();
  const pattern = escapeLike(term);
  const columns = "id, title, author, code, quantity";
  const [byTitle, byCode] = await Promise.all([
    supabase.from("books").select(columns).eq("status", "active").ilike("title", `%${pattern}%`).order("title").limit(LOOKUP_MAX_RESULTS),
    supabase.from("books").select(columns).eq("status", "active").ilike("code", `${pattern}%`).order("code").limit(LOOKUP_MAX_RESULTS),
  ]);
  if (byTitle.error || byCode.error) throw new Error("Não foi possível fazer a consulta.");

  const found = [...new Map([...byTitle.data, ...byCode.data].map((book) => [book.id, book as BookRow])).values()];
  const books = found.sort((a, b) => a.title.localeCompare(b.title, "pt-BR")).slice(0, LOOKUP_MAX_RESULTS);
  if (books.length === 0) return [];

  const shelf = await supabase.rpc("book_availability");
  if (shelf.error) throw new Error("Não foi possível consultar a situação dos livros.");
  const rows = shelfByBook(shelf.data as ShelfRow[]);
  return books.map((book) => {
    const situation = shelfStatus(book.quantity, rows.get(book.id)).situation;
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      code: book.code,
      situation: situation === "inactive" ? "unavailable" : situation,
    };
  });
}

interface TeacherRow {
  id: string;
  full_name: string;
  registration: string | null;
  course: string | null;
}

// Professores ativos pelo nome ou pela matrícula. Só a funcionária enxerga outros perfis (RLS). Dado pessoal
// consultado: fica registrado quem viu cada perfil (só ids, sem o termo digitado).
export async function searchTeachers(term: string, actorId: string): Promise<PickableTeacher[]> {
  await connection();
  const supabase = await createSupabaseServerClient();
  const pattern = escapeLike(term);
  const columns = "id, full_name, registration, course";
  const [byName, byRegistration] = await Promise.all([
    supabase.from("profiles").select(columns).eq("role", "teacher").eq("active", true).ilike("full_name", `%${pattern}%`).order("full_name").limit(LOOKUP_MAX_RESULTS),
    supabase.from("profiles").select(columns).eq("role", "teacher").eq("active", true).ilike("registration", `${pattern}%`).order("registration").limit(LOOKUP_MAX_RESULTS),
  ]);
  if (byName.error || byRegistration.error) throw new Error("Não foi possível fazer a consulta.");

  const found = [...new Map([...byName.data, ...byRegistration.data].map((row) => [row.id, row as TeacherRow])).values()];
  const teachers = found.sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR")).slice(0, LOOKUP_MAX_RESULTS);
  await Promise.all(teachers.map((teacher) => recordAudit({ actorId, action: "profile_viewed", entity: "profiles", entityId: teacher.id })));

  return teachers.map((teacher) => ({
    id: teacher.id,
    name: teacher.full_name,
    initials: initialsOf(teacher.full_name),
    registration: teacher.registration ?? "—",
    detail: teacher.course ?? "Professor",
  }));
}

// ---- Leituras ----

// "Minhas reservas pedagógicas": o RLS já limita ao próprio professor; o filtro por teacher_id deixa a intenção explícita.
export async function listMyReservations(teacherId: string): Promise<ReservationView[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pedagogical_reservations")
    .select(RESERVATION_COLUMNS)
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(MY_RESERVATIONS_LIMIT);
  if (error) throw new Error("Não foi possível consultar as suas reservas.");
  return (data as unknown as ReservationRow[]).map(toReservationView);
}

async function countByStatus(supabase: Client, status: QueueFilter): Promise<number> {
  const { count, error } = await supabase
    .from("pedagogical_reservations")
    .select("id", { count: "exact", head: true })
    .eq("status", status)
    .limit(1);
  if (error) throw new Error("Não foi possível consultar a fila.");
  return count ?? 0;
}

// Fila da funcionária: a página pedida e os números dos chips. Pendentes: a mais antiga primeiro (ordem de chegada);
// as demais: a mais recente primeiro.
export async function listQueue(filters: QueueFilters): Promise<QueueList> {
  const supabase = await createSupabaseServerClient();
  const [pending, approved, rejected, returned] = await Promise.all([
    countByStatus(supabase, "pending"),
    countByStatus(supabase, "approved"),
    countByStatus(supabase, "rejected"),
    countByStatus(supabase, "returned"),
  ]);
  const counts: QueueCounts = { pending, approved, rejected, returned };

  const total = counts[filters.filter];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const empty: QueueList = { reservations: [], counts, total, page, pages, pageSize: PAGE_SIZE };
  if (total === 0) return empty;

  const { data, error } = await supabase
    .from("pedagogical_reservations")
    .select(RESERVATION_COLUMNS)
    .eq("status", filters.filter)
    .order("created_at", { ascending: filters.filter === "pending" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error("Não foi possível consultar a fila.");
  return { ...empty, reservations: (data as unknown as ReservationRow[]).map(toReservationView) };
}

// Uma solicitação pelo id (painel de detalhe). Nulo se não existe (o RLS esconde as dos outros).
export async function getReservation(id: string): Promise<ReservationView | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("pedagogical_reservations").select(RESERVATION_COLUMNS).eq("id", id).limit(1);
  if (error) throw new Error("Não foi possível consultar a solicitação.");
  const row = (data as unknown as ReservationRow[])[0];
  return row ? toReservationView(row) : null;
}

// Disponibilidade dos livros da solicitação (Figma, card 0142): exemplares livres agora, na mesma conta do banco
// (quantidade - empréstimos em aberto - reservas do aluno prontas - guardados por OUTRAS reservas pedagógicas aprovadas).
// Só a funcionária lê empréstimos e reservas dos outros (RLS). Sem nome de pessoa: só contagens e a data de volta.
export async function getAvailability(reservation: ReservationView): Promise<BookAvailability[]> {
  // Renovação não precisa de exemplar livre: os exemplares já estão guardados na reserva original.
  if (reservation.renewal) return [];
  const supabase = await createSupabaseServerClient();
  const ids = reservation.books.map((book) => book.id);
  if (ids.length === 0) return [];

  const [books, loans, ready, held] = await Promise.all([
    supabase.from("books").select("id, quantity").in("id", ids).limit(ids.length),
    supabase.from("loans").select("book_id, due_at").in("book_id", ids).is("returned_at", null).limit(AVAILABILITY_LIMIT),
    supabase.from("reservations").select("book_id").in("book_id", ids).eq("status", "ready").limit(AVAILABILITY_LIMIT),
    supabase
      .from("pedagogical_reservation_books")
      .select("book_id, reservation_id, pedagogical_reservations!inner(status, start_date, days)")
      .in("book_id", ids)
      .eq("pedagogical_reservations.status", "approved")
      .neq("reservation_id", reservation.id)
      .limit(AVAILABILITY_LIMIT),
  ]);
  if (books.error || loans.error || ready.error || held.error) throw new Error("Não foi possível consultar a disponibilidade.");

  const heldRows = held.data as unknown as Array<{ book_id: string; pedagogical_reservations: { start_date: string; days: number } }>;
  return reservation.books.map((book) => {
    const quantity = books.data.find((row) => row.id === book.id)?.quantity ?? 0;
    const bookLoans = loans.data.filter((loan) => loan.book_id === book.id);
    const bookHeld = heldRows.filter((row) => row.book_id === book.id);
    const freeCopies = quantity - bookLoans.length - ready.data.filter((row) => row.book_id === book.id).length - bookHeld.length;

    // Primeira data em que um exemplar volta: prazo de empréstimo ou fim do período de outra reserva aprovada.
    const returns = [
      ...bookLoans.map((loan) => todayInBrasilia(new Date(loan.due_at))),
      ...bookHeld.map((row) => addDays(row.pedagogical_reservations.start_date, row.pedagogical_reservations.days)),
    ].sort();
    return {
      bookId: book.id,
      title: book.title,
      freeCopies: Math.max(0, freeCopies),
      conflict: freeCopies < 1,
      nextReturnOn: returns[0] ? formatIsoDate(returns[0]) : null,
    };
  });
}

// ---- Escritas: quem decide é a função do banco (permissão, regras, auditoria e idempotência) ----

type Rpc = { error: { message?: string; code?: string } | null };

// Resultado padrão das escritas. Só o código do erro vai para o log (nunca nome, matrícula ou texto do banco).
function toResult(action: string, { error }: Rpc): ReservationActionResult {
  if (!error) return { ok: true };
  console.error(`Falha em ${action}:`, reservationErrorCode(error) ?? error.code ?? "desconhecido");
  return { ok: false, message: reservationErrorMessage(error), final: isFinalReservationError(error) };
}

export async function requestReservation(values: ReservationValues, idempotencyKey: string): Promise<ReservationActionResult> {
  const supabase = await createSupabaseServerClient();
  return toResult(
    "request_pedagogical_reservation",
    await supabase.rpc("request_pedagogical_reservation", {
      p_book_ids: values.bookIds,
      p_start_date: values.startDate,
      p_days: values.days,
      p_purpose: values.purpose,
      p_idempotency_key: idempotencyKey,
    }),
  );
}

export async function registerInPersonReservation(
  teacherId: string,
  values: ReservationValues,
  idempotencyKey: string,
): Promise<ReservationActionResult> {
  const supabase = await createSupabaseServerClient();
  return toResult(
    "register_in_person_pedagogical_reservation",
    await supabase.rpc("register_in_person_pedagogical_reservation", {
      p_teacher_id: teacherId,
      p_book_ids: values.bookIds,
      p_start_date: values.startDate,
      p_days: values.days,
      p_purpose: values.purpose,
      p_idempotency_key: idempotencyKey,
    }),
  );
}

export async function decideReservation(
  reservationId: string,
  approve: boolean,
  note: string | null,
  idempotencyKey: string,
): Promise<ReservationActionResult> {
  const supabase = await createSupabaseServerClient();
  return toResult(
    "decide_pedagogical_reservation",
    await supabase.rpc("decide_pedagogical_reservation", {
      p_reservation_id: reservationId,
      p_approve: approve,
      p_note: note,
      p_idempotency_key: idempotencyKey,
    }),
  );
}

export async function returnReservation(reservationId: string, idempotencyKey: string): Promise<ReservationActionResult> {
  const supabase = await createSupabaseServerClient();
  return toResult(
    "return_pedagogical_reservation",
    await supabase.rpc("return_pedagogical_reservation", { p_reservation_id: reservationId, p_idempotency_key: idempotencyKey }),
  );
}

// Pedido de renovação (só o professor dono da reserva aprovada): mais dias, com nova aprovação da funcionária. O banco confere
// dono, janela (última semana), limite de dias, uma pendente por reserva e o teto de 365 dias.
export async function requestRenewal(reservationId: string, days: number, idempotencyKey: string): Promise<ReservationActionResult> {
  const supabase = await createSupabaseServerClient();
  return toResult(
    "request_pedagogical_renewal",
    await supabase.rpc("request_pedagogical_renewal", { p_reservation_id: reservationId, p_days: days, p_idempotency_key: idempotencyKey }),
  );
}
