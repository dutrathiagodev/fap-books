// Único lugar que traduz o erro da função pay_fine em frase da tela. O banco levanta uma exceção cuja mensagem é um
// código estável (o "hint" em português não é usado de propósito); falta de permissão chega como SQLSTATE 42501.
export const GENERIC_FINE_ERROR = "Não foi possível registrar o pagamento agora. Tente de novo.";

export const FINE_ERROR_MESSAGES = {
  fine_not_found: "Multa não encontrada. Atualize a tela e confira a lista.",
  forbidden: "Você não tem permissão para dar baixa em multas.",
  idempotency_key_reused: "Esta ação já foi enviada. Atualize a tela e confira antes de tentar de novo.",
} as const;

type FineErrorCode = keyof typeof FINE_ERROR_MESSAGES;

interface DbError {
  message?: string;
  code?: string;
}

const CODES = Object.keys(FINE_ERROR_MESSAGES) as FineErrorCode[];

// Código conhecido do erro do banco, ou null (erro de rede, de configuração ou desconhecido).
export function fineErrorCode(error: DbError): FineErrorCode | null {
  if (error.code === "42501") return "forbidden";
  return CODES.find((code) => error.message?.includes(code)) ?? null;
}

export function fineErrorMessage(error: DbError): string {
  const code = fineErrorCode(error);
  return code ? FINE_ERROR_MESSAGES[code] : GENERIC_FINE_ERROR;
}

// Erro de regra (multa não existe, sem permissão): repetir a mesma ação não adianta, então a chave de idempotência é
// descartada. Erro de rede ou desconhecido mantém a chave: a nova tentativa é a mesma ação e vale uma vez só.
export function isFinalFineError(error: DbError): boolean {
  return fineErrorCode(error) !== null;
}
