import { connection } from "next/server";
import { isUuid } from "@/domain/books/book-rules";
import { GENERIC_RESERVATION_ERROR, reservationErrorMessage } from "@/domain/reservations/book-reservation-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { BookReservationInfo, MyReservation, QueueEntry, ReservationActionResult, ReservationStatus } from "@/types/reservation";

// Fila de espera do livro indisponível (cards 0044 e 0045, RF-13 e RF-20). Quem decide de verdade é o banco: as funções
// reserve_book, cancel_reservation e expire_reservation conferem papel, limite, atraso, multa e exemplar livre, gravam
// e auditam numa transação, e aceitam uma chave de idempotência (uma por ação na tela: clique duplo vale uma vez).

const MY_RESERVATIONS_LIMIT = 50;
const QUEUE_LIMIT = 100;

// ---- Leitura: as minhas reservas (contrato usado pela tela "Minhas reservas", card 0216) ----

interface MyReservationRow {
  id: string;
  book_id: string;
  title: string;
  author: string;
  code: string;
  cover_url: string | null;
  status: ReservationStatus;
  created_at: string;
  ready_at: string | null;
  expires_at: string | null;
  queue_position: number | null;
}

// As reservas de quem está logado, as ativas primeiro (a pronta e depois a fila), no máximo 50. Nunca traz dado de outra
// pessoa. Em caso de erro lança uma exceção com texto em português (a tela mostra a página de erro).
export async function listMyReservations(limit = MY_RESERVATIONS_LIMIT): Promise<MyReservation[]> {
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_my_reservations", { p_limit: Math.min(Math.max(Math.trunc(limit), 1), 100) });
  if (error) throw new Error("Não foi possível carregar as suas reservas.");
  return (data as MyReservationRow[]).map((row) => ({
    id: row.id,
    bookId: row.book_id,
    title: row.title,
    author: row.author,
    code: row.code,
    coverUrl: row.cover_url,
    status: row.status,
    createdAt: row.created_at,
    readyAt: row.ready_at,
    expiresAt: row.expires_at,
    queuePosition: row.queue_position,
  }));
}

// ---- Leitura: a fila de um livro ----

interface BookReservationStatusRow {
  queue_size: number;
  my_reservation_id: string | null;
  my_status: ReservationStatus | null;
  my_position: number | null;
  my_expires_at: string | null;
}

// Tamanho da fila (só um número) e a situação de quem está logado naquele livro.
export async function getBookReservationInfo(bookId: string): Promise<BookReservationInfo | null> {
  if (!isUuid(bookId)) return null;
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("book_reservation_status", { p_book_id: bookId });
  if (error) throw new Error("Não foi possível consultar a fila deste livro.");
  const row = (data as BookReservationStatusRow[])[0];
  if (!row) return null;
  return {
    queueSize: row.queue_size,
    myReservationId: row.my_reservation_id,
    myStatus: row.my_status,
    myPosition: row.my_position,
    myExpiresAt: row.my_expires_at,
  };
}

interface QueueRow {
  id: string;
  status: "waiting" | "ready";
  created_at: string;
  expires_at: string | null;
  profiles: { full_name: string; registration: string | null; phone: string | null } | null;
}

// Só a funcionária enxerga quem está na fila (o RLS devolve vazio para os outros perfis): as prontas primeiro, depois
// quem espera por ordem de chegada. No máximo 100 linhas.
export async function listBookQueue(bookId: string): Promise<QueueEntry[]> {
  if (!isUuid(bookId)) return [];
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("id, status, created_at, expires_at, profiles!reservations_user_id_fkey(full_name, registration, phone)")
    .eq("book_id", bookId)
    .in("status", ["waiting", "ready"])
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(QUEUE_LIMIT);
  if (error) throw new Error("Não foi possível carregar a fila do livro.");

  const rows = data as unknown as QueueRow[];
  const ordered = [...rows.filter((row) => row.status === "ready"), ...rows.filter((row) => row.status === "waiting")];
  let waiting = 0;
  return ordered.map((row) => ({
    id: row.id,
    userName: row.profiles?.full_name ?? "Usuário",
    registration: row.profiles?.registration ?? null,
    phone: row.profiles?.phone ?? null,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    position: row.status === "waiting" ? ++waiting : 0,
  }));
}

// ---- Escrita ----

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type RpcResult = PromiseLike<{ error: { message?: string; code?: string; details?: string | null } | null }>;

async function run(call: (supabase: Client) => RpcResult, what: string): Promise<ReservationActionResult> {
  try {
    const { error } = await call(await createSupabaseServerClient());
    if (error) {
      console.error(`Falha ao ${what}:`, error.message);
      return { ok: false, message: reservationErrorMessage(error) };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: GENERIC_RESERVATION_ERROR };
  }
}

// Entra na fila do livro (a própria pessoa).
export function reserveBook(bookId: string, idempotencyKey: string): Promise<ReservationActionResult> {
  return run((supabase) => supabase.rpc("reserve_book", { p_book_id: bookId, p_idempotency_key: idempotencyKey }), "reservar o livro");
}

// Cancela a reserva (a dona ou a funcionária). O banco passa a vez para o próximo da fila.
export function cancelReservation(reservationId: string, idempotencyKey: string): Promise<ReservationActionResult> {
  return run(
    (supabase) => supabase.rpc("cancel_reservation", { p_reservation_id: reservationId, p_idempotency_key: idempotencyKey }),
    "cancelar a reserva",
  );
}

// Só a funcionária: a pessoa não retirou o livro; a reserva pronta expira e a vez passa para o próximo.
export function expireReservation(reservationId: string, idempotencyKey: string): Promise<ReservationActionResult> {
  return run(
    (supabase) => supabase.rpc("expire_reservation", { p_reservation_id: reservationId, p_idempotency_key: idempotencyKey }),
    "expirar a reserva",
  );
}
