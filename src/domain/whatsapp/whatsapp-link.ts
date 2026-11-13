import type { DeadlineStatus } from "../../types/panel";

// Aviso por WhatsApp sem custo e sem API: a funcionária clica, o WhatsApp abre com a mensagem pronta e ela envia.
// O número vem do cadastro (só dígitos, com DDD); o servidor monta o link e só a bibliotecária o recebe.

// Telefone do Brasil (DDD + 8 ou 9 dígitos, com ou sem o 55) para o formato internacional do WhatsApp. Inválido vira null.
export function normalizeBrazilianPhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  const national = digits.length >= 12 && digits.startsWith("55") ? digits.slice(2) : digits;
  if (!/^[1-9][0-9][2-9][0-9]{7,8}$/.test(national)) return null;
  return `55${national}`;
}

// Link wa.me com o texto já preenchido. Sem telefone válido, não há link.
export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  const number = normalizeBrazilianPhone(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

// Link para conversar com a própria biblioteca (usado pelo assistente de ajuda quando ele não sabe responder).
export function buildLibraryChatUrl(libraryNumber: string, message: string): string {
  return `https://wa.me/${libraryNumber}?text=${encodeURIComponent(message)}`;
}

// Texto que vai preenchido na conversa com a biblioteca quando o assistente não sabe responder. Leva só a pergunta que a pessoa digitou.
const HELP_QUESTION_MAX = 200;
export function buildHelpRequestMessage(question: string): string {
  const clean = question.replace(/\s+/g, " ").trim().slice(0, HELP_QUESTION_MAX);
  return clean ? `Olá! Vim pelo FAP Books e preciso de ajuda: ${clean}` : "Olá! Vim pelo FAP Books e preciso de ajuda.";
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

export interface NoticeMessageInput {
  status: DeadlineStatus;
  userName: string;
  bookTitle: string;
  // dd/mm/aaaa
  dueOn: string;
  daysLate: number;
  // "Multa: R$ 4,00"
  fineLabel: string;
}

// Texto do aviso. Fala só do empréstimo em questão: nada de dado de outra pessoa ou de outro livro.
export function buildNoticeMessage(input: NoticeMessageInput): string {
  const greeting = `Olá, ${firstName(input.userName)}! Aqui é a Biblioteca da FAP.`;
  const book = `"${input.bookTitle}"`;
  if (input.status === "overdue") {
    const days = input.daysLate === 1 ? "1 dia" : `${input.daysLate} dias`;
    return `${greeting} O empréstimo do livro ${book} venceu em ${input.dueOn} (${days} de atraso). ${input.fineLabel}. Pode devolver na biblioteca? Se precisar de ajuda, é só responder esta mensagem.`;
  }
  if (input.status === "today") {
    return `${greeting} O livro ${book} vence hoje (${input.dueOn}). Pode devolver na biblioteca ainda hoje? Se precisar de mais tempo, fale com a gente.`;
  }
  return `${greeting} O livro ${book} vence em ${input.dueOn}. Lembrando para você devolver no prazo. Se precisar de mais tempo, fale com a gente.`;
}

export interface ReservationReadyMessageInput {
  userName: string;
  bookTitle: string;
  // dd/mm/aaaa
  pickupUntil: string;
}

// Aviso de que o livro da fila chegou. Fala só da reserva da própria pessoa.
export function buildReservationReadyMessage(input: ReservationReadyMessageInput): string {
  return `Olá, ${firstName(input.userName)}! Aqui é a Biblioteca da FAP. O livro "${input.bookTitle}" que você reservou já está disponível para retirada. Guardamos o exemplar para você até ${input.pickupUntil}; depois dessa data ele segue para a próxima pessoa da fila.`;
}
