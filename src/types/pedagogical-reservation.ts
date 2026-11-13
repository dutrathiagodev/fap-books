// Tipos da reserva pedagógica (Figma, cards 0135, 0138 e 0140). Datas já formatadas pelo servidor (dd/mm/aaaa).

// Igual ao check de pedagogical_reservations.status no banco.
export type ReservationStatus = "pending" | "approved" | "rejected" | "returned" | "cancelled";

// Chips da fila da funcionária (o "cancelled" não tem tela: o professor ainda não cancela).
export type QueueFilter = "pending" | "approved" | "rejected" | "returned";

export interface QueueFilters {
  filter: QueueFilter;
  page: number;
  // Solicitação aberta no painel de detalhe (uuid) ou nulo.
  detail: string | null;
}

export interface ReservationBook {
  id: string;
  title: string;
  code: string;
}

// Uma solicitação (cartão do professor e linha da fila).
export interface ReservationView {
  id: string;
  teacherName: string;
  teacherInitials: string;
  books: ReservationBook[];
  status: ReservationStatus;
  inPerson: boolean;
  // Renovação de outra reserva (campo renewal_of): pedido de mais dias, com nova aprovação. Não tem livros próprios:
  // "books" traz os da reserva original.
  renewal: boolean;
  // Id da reserva original, quando é renovação.
  renewalOf: string | null;
  startOn: string;
  // Dia da devolução (início + prazo).
  endOn: string;
  // O mesmo dia em aaaa-mm-dd, para conferir a janela de renovação.
  endDate: string;
  days: number;
  requestedOn: string;
  purpose: string | null;
  // Justificativa da decisão (obrigatória na recusa).
  decisionNote: string | null;
  decidedBy: string | null;
  decidedOn: string | null;
  returnedOn: string | null;
}

export interface QueueCounts {
  pending: number;
  approved: number;
  rejected: number;
  returned: number;
}

export interface QueueList {
  reservations: ReservationView[];
  counts: QueueCounts;
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

// Disponibilidade de um livro da solicitação aberta no detalhe (Figma, 0140: "Disponibilidade no período pedido").
export interface BookAvailability {
  bookId: string;
  title: string;
  // Exemplares livres agora, já descontando empréstimos, reservas prontas e outras reservas pedagógicas aprovadas.
  freeCopies: number;
  conflict: boolean;
  // Quando um exemplar volta (dd/mm/aaaa), se houver conflito e previsão.
  nextReturnOn: string | null;
}

// Livro encontrado na busca do seletor.
export interface PickableBook {
  id: string;
  title: string;
  author: string;
  code: string;
  situation: "available" | "unavailable" | "reserved";
}

// Professor encontrado na busca do balcão.
export interface PickableTeacher {
  id: string;
  name: string;
  initials: string;
  registration: string;
  detail: string;
}

export type LookupResult<T> = { ok: true; items: T[] } | { ok: false; reason: "term_too_short" | "error" };

// "final": erro de regra (repetir não adianta, a tela descarta a chave de idempotência); sem "final" é falha passageira.
export type ReservationActionResult = { ok: true } | { ok: false; message: string; final: boolean };

// Dados do formulário (professor ou balcão). No balcão, teacherId é o professor escolhido.
export interface ReservationSubmitPayload {
  teacherId?: string;
  bookIds: string[];
  startDate: string;
  days: number;
  purpose: string;
}

// Resposta do envio: além do resultado comum, o servidor pode devolver o erro de cada campo.
export type ReservationSubmitResult = ReservationActionResult | { ok: false; message: string; final: true; fieldErrors: Record<string, string> };
