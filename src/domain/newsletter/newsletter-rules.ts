// Regras da inscrição na newsletter da landing. Só lógica pura (sem banco), para testar fácil.
// Os mesmos limites existem como constraints na tabela newsletter_subscribers: se um falhar, o outro segura.

// Versão do texto de consentimento mostrado na tela. Troque ao mudar o texto e guarde a versão com cada inscrição.
export const CONSENT_TEXT_VERSION = "newsletter-v1";

const NAME_MIN = 2;
const NAME_MAX = 100;
const EMAIL_MAX = 254;
const EMAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface NewsletterSubscription {
  email: string;
  fullName: string;
}

export interface NewsletterInput {
  name: unknown;
  email: unknown;
  consent: unknown;
  // Campo-isca: invisível para pessoas, preenchido por robôs de spam.
  website: unknown;
}

export type ParsedSubscription =
  | { status: "valid"; data: NewsletterSubscription }
  | { status: "bot" }
  | { status: "invalid"; message: string };

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// Tira caracteres de controle e espaços repetidos do nome.
export function cleanName(value: unknown): string {
  return text(value).replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim();
}

export function cleanEmail(value: unknown): string {
  return text(value).trim().toLowerCase();
}

// Valida o que veio do formulário. Nunca confie na tela: isto roda no servidor.
export function parseSubscription(input: NewsletterInput): ParsedSubscription {
  if (text(input.website).trim() !== "") return { status: "bot" };

  const fullName = cleanName(input.name);
  if (fullName.length < NAME_MIN || fullName.length > NAME_MAX) {
    return { status: "invalid", message: `Informe seu nome (de ${NAME_MIN} a ${NAME_MAX} letras).` };
  }

  const email = cleanEmail(input.email);
  if (email.length > EMAIL_MAX || !EMAIL_FORMAT.test(email)) {
    return { status: "invalid", message: "Informe um e-mail válido." };
  }

  if (input.consent !== "on") {
    return { status: "invalid", message: "Marque o aceite para receber as novidades." };
  }

  return { status: "valid", data: { email, fullName } };
}
