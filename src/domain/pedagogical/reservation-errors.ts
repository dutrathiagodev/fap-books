// Único lugar que traduz o erro das funções da reserva pedagógica em frase da tela. O banco levanta uma exceção cuja
// mensagem é um código estável (o "hint" em português não é usado de propósito: o texto de cada código fica só aqui).
// Falta de permissão chega como SQLSTATE 42501.
export const GENERIC_RESERVATION_ERROR = "Não foi possível concluir agora. Tente de novo.";

export const RESERVATION_ERROR_MESSAGES = {
  books_required: "Escolha pelo menos um livro.",
  too_many_books: "Há livros demais nesta solicitação. Escolha menos livros.",
  duplicate_books: "O mesmo livro foi escolhido mais de uma vez.",
  invalid_days: "O prazo está acima do limite de dias da biblioteca. Confira o máximo no formulário.",
  start_in_past: "A data de início não pode ser no passado.",
  start_too_far: "A data de início deve ser dentro de um ano.",
  purpose_too_long: "A disciplina deve ter no máximo 120 caracteres.",
  book_not_found: "Livro não encontrado. Busque o livro de novo.",
  book_inactive: "Um dos livros não está disponível no acervo.",
  teacher_not_found: "Professor não encontrado ou inativo.",
  reservation_not_found: "Solicitação não encontrada. Atualize a tela e confira a fila.",
  already_decided: "Esta solicitação já foi decidida. Atualize a tela.",
  note_required: "Informe a justificativa da recusa.",
  note_too_long: "A justificativa deve ter no máximo 500 caracteres.",
  decision_required: "Escolha aprovar ou recusar.",
  no_copy_available: "Um dos livros não tem exemplar livre agora. Confira a disponibilidade ou recuse com justificativa.",
  reservation_not_approved: "Só uma reserva aprovada pode ser devolvida ou renovada.",
  renewal_too_early: "A renovação só pode ser pedida na última semana do prazo da reserva.",
  renewal_already_pending: "Já existe um pedido de renovação aguardando aprovação desta reserva.",
  renewal_too_long: "O período total da reserva não pode passar de 365 dias.",
  renewal_of_renewal: "Peça a renovação sobre a reserva original.",
  forbidden: "Você não tem permissão para esta ação.",
  idempotency_key_reused: "Esta ação já foi enviada. Atualize a tela e confira antes de tentar de novo.",
} as const;

export type ReservationErrorCode = keyof typeof RESERVATION_ERROR_MESSAGES;

interface DbError {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

const FORBIDDEN_SQLSTATE = "42501";
const CODES = Object.keys(RESERVATION_ERROR_MESSAGES) as ReservationErrorCode[];

// Acha o código no erro do banco. A mensagem da exceção é o código; se vier junto de outro texto, procura nele.
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

// Erro de regra: repetir a mesma ação não adianta, então a chave de idempotência é descartada. Erro de rede ou
// desconhecido mantém a chave: a nova tentativa é a mesma ação e vale uma vez só.
export function isFinalReservationError(error: DbError | null | undefined): boolean {
  return reservationErrorCode(error) !== null;
}
