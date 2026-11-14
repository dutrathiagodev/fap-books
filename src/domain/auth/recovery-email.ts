// Validação do e-mail do pedido "Esqueci minha senha" (FAP-0266). Só o formato: quem diz se a conta existe é o Supabase, e
// essa resposta nunca chega à tela (a confirmação é sempre a mesma, para não revelar quais e-mails têm cadastro).

const EMAIL_MAX = 254;
const EMAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const INVALID_EMAIL_MESSAGE = "Digite um e-mail válido, por exemplo nome@email.com.";

export type ParsedRecoveryEmail = { status: "valid"; email: string } | { status: "invalid" };

// Aceita o que veio do formulário (pode ser qualquer coisa). O e-mail volta em minúsculas e sem espaços nas pontas,
// que é também a chave do limite por e-mail: "Maria@x.com " e "maria@x.com" contam como o mesmo.
export function parseRecoveryEmail(raw: unknown): ParsedRecoveryEmail {
  if (typeof raw !== "string") return { status: "invalid" };
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > EMAIL_MAX || !EMAIL_FORMAT.test(email)) return { status: "invalid" };
  return { status: "valid", email };
}
