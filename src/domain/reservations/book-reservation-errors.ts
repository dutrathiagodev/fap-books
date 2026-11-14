// Traduz o erro das funções reserve_book, cancel_reservation e expire_reservation em frase para a tela.
// A mensagem da exceção do banco é um código estável; o texto em português fica aqui, em um lugar só, e nunca o
// texto bruto do banco. Falta de permissão chega como SQLSTATE 42501.
export const GENERIC_RESERVATION_ERROR = "Não foi possível concluir agora. Tente de novo.";

export const RESERVATION_ERROR_MESSAGES = {
  book_available: "Este livro está disponível: peça o empréstimo na biblioteca.",
  already_reserved: "Você já está na fila deste livro.",
  already_borrowed: "Você já está com este livro.",
  loan_limit_reached: "Você já está no limite de livros emprestados. Devolva um para entrar na fila.",
  user_has_pending: "Você tem livro em atraso ou multa em aberto. Procure a biblioteca para regularizar.",
  book_inactive: "Este livro não está mais disponível no acervo.",
  book_not_found: "Livro não encontrado.",
  user_not_found: "Usuário não encontrado ou inativo.",
  reservation_not_found: "Reserva não encontrada.",
  reservation_already_fulfilled: "Esta reserva já virou empréstimo.",
  reservation_expired: "O prazo desta reserva já passou.",
  reservation_not_ready: "Só uma reserva pronta para retirada pode expirar.",
  forbidden: "Você não tem permissão para esta ação.",
  idempotency_key_reused: "Esta ação já foi enviada. Atualize a tela e confira antes de tentar de novo.",
} as const;

export type ReservationErrorCode = keyof typeof RESERVATION_ERROR_MESSAGES;

interface DbError {
  message?: string;
  code?: string;
  details?: string | null;
}

const FORBIDDEN_SQLSTATE = "42501";
const CODES = Object.keys(RESERVATION_ERROR_MESSAGES) as ReservationErrorCode[];

export function reservationErrorCode(error: DbError | null | undefined): ReservationErrorCode | null {
  if (!error) return null;
  if (error.code === FORBIDDEN_SQLSTATE) return "forbidden";
  const message = (error.message ?? "").trim();
  const exact = CODES.find((code) => code === message);
  if (exact) return exact;
  const text = `${message} ${error.details ?? ""}`;
  return CODES.find((code) => text.includes(code)) ?? null;
}

export function reservationErrorMessage(error: DbError | null | undefined): string {
  const code = reservationErrorCode(error);
  return code ? RESERVATION_ERROR_MESSAGES[code] : GENERIC_RESERVATION_ERROR;
}
