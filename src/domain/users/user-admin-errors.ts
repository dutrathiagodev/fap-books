// Único lugar que traduz o erro das funções update_profile_admin e set_profile_active em frase da tela. O banco levanta uma
// exceção cuja mensagem é um código estável (o "hint" em português não é usado de propósito); falta de permissão chega como
// SQLSTATE 42501.
export const GENERIC_USER_ADMIN_ERROR = "Não foi possível concluir agora. Tente de novo.";

export const USER_ADMIN_ERROR_MESSAGES = {
  forbidden: "Você não tem permissão para gerenciar usuários.",
  profile_not_found: "Usuário não encontrado. Atualize a tela e confira a lista.",
  cannot_change_own_role: "Você não pode mudar o seu próprio perfil.",
  cannot_change_own_status: "Você não pode inativar a si mesma.",
  has_open_loans: "Esta pessoa tem empréstimo em aberto. Confirme para inativar mesmo assim.",
  invalid_name: "Informe o nome completo.",
  invalid_phone: "Use o telefone com DDD, ex.: (11) 98765-4321.",
  invalid_registration: "A matrícula tem de 5 a 8 números.",
  invalid_course: "Informe o curso (até 80 caracteres).",
  job_title_required: "Informe o cargo (até 80 caracteres).",
  invalid_role: "Escolha o perfil.",
  invalid_status: "Situação inválida. Atualize a tela e tente de novo.",
  registration_taken: "Já existe um usuário com essa matrícula.",
  idempotency_key_reused: "Esta ação já foi enviada. Atualize a tela e confira antes de tentar de novo.",
} as const;

export type UserAdminErrorCode = keyof typeof USER_ADMIN_ERROR_MESSAGES;

interface DbError {
  message?: string;
  code?: string;
}

const FORBIDDEN_SQLSTATE = "42501";
const CODES = Object.keys(USER_ADMIN_ERROR_MESSAGES) as UserAdminErrorCode[];

// Código conhecido do erro do banco, ou null (erro de rede, de configuração ou desconhecido).
export function userAdminErrorCode(error: DbError): UserAdminErrorCode | null {
  if (error.code === FORBIDDEN_SQLSTATE) return "forbidden";
  return CODES.find((code) => error.message?.includes(code)) ?? null;
}

export function userAdminErrorMessage(error: DbError): string {
  const code = userAdminErrorCode(error);
  return code ? USER_ADMIN_ERROR_MESSAGES[code] : GENERIC_USER_ADMIN_ERROR;
}

// Erro de regra: repetir a mesma ação não adianta, então a chave de idempotência é descartada. Erro de rede ou desconhecido
// mantém a chave: a nova tentativa é a mesma ação e vale uma vez só.
export function isFinalUserAdminError(error: DbError): boolean {
  return userAdminErrorCode(error) !== null;
}
