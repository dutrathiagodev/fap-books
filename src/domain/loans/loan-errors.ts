import { LOAN_BLOCK_MESSAGES, RENEW_BLOCK_MESSAGES } from "./loan-rules";

// Único lugar que traduz erro de empréstimo em mensagem da tela. As funções create_loan, return_loan e renew_loan do banco
// levantam uma exceção cuja mensagem é o código (o "hint" é um texto em português, que a tela não usa de propósito: o
// texto de cada código fica aqui, em um lugar só). Falta de permissão chega como SQLSTATE 42501.
// As frases dos bloqueios que a tela também confere antes (limite, multa, atraso) vêm do loan-rules.
export const GENERIC_LOAN_ERROR = "Não foi possível concluir agora. Tente de novo.";

export const LOAN_ERROR_MESSAGES = {
  loan_limit_reached: LOAN_BLOCK_MESSAGES.limit_reached,
  no_copy_available: LOAN_BLOCK_MESSAGES.book_unavailable,
  copy_reserved_for_others: "O exemplar livre está reservado para outra pessoa.",
  user_has_pending: LOAN_BLOCK_MESSAGES.open_fine,
  user_inactive: "Usuário inativo não pode pegar livros.",
  user_not_found: "Usuário não encontrado.",
  book_inactive: "Este livro está inativo e não pode ser emprestado.",
  book_not_found: "Livro não encontrado.",
  already_borrowed: LOAN_BLOCK_MESSAGES.already_has_book,
  loan_not_found: "Empréstimo não encontrado.",
  loan_already_returned: "Este empréstimo já foi devolvido.",
  loan_overdue: RENEW_BLOCK_MESSAGES.overdue,
  book_has_reservations: "Outra pessoa reservou este livro: ele não pode ser renovado.",
  renewal_limit_reached: RENEW_BLOCK_MESSAGES.limit,
  forbidden: "Você não tem permissão para esta ação.",
  idempotency_key_reused: "Esta ação já foi enviada. Atualize a tela e confira antes de tentar de novo.",
} as const;

export type LoanErrorCode = keyof typeof LOAN_ERROR_MESSAGES;

interface DbError {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

const FORBIDDEN_SQLSTATE = "42501";
const CODES = Object.keys(LOAN_ERROR_MESSAGES) as LoanErrorCode[];

// Acha o código no erro do banco. A mensagem da exceção é o código; se vier junto de outro texto, procura nele.
export function loanErrorCode(error: DbError | null | undefined): LoanErrorCode | null {
  if (!error) return null;
  if (error.code === FORBIDDEN_SQLSTATE) return "forbidden";
  const message = (error.message ?? "").trim();
  const exact = CODES.find((code) => code === message);
  if (exact) return exact;
  const text = `${message} ${error.details ?? ""}`;
  return CODES.find((code) => text.includes(code)) ?? null;
}

// Mensagem para a bibliotecária. Nunca devolve o texto bruto do banco.
export function loanErrorMessage(error: DbError | null | undefined): string {
  const code = loanErrorCode(error);
  return code ? LOAN_ERROR_MESSAGES[code] : GENERIC_LOAN_ERROR;
}
