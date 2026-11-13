// Fila de espera do livro indisponível (cards 0044, 0045 e 0216). Datas em ISO; quem formata é a tela.

// Igual ao check de reservations.status no banco: waiting = na fila, ready = exemplar guardado (prazo para retirar),
// fulfilled = virou empréstimo, cancelled = cancelada, expired = passou do prazo de retirada.
export type ReservationStatus = "waiting" | "ready" | "fulfilled" | "cancelled" | "expired";

// Uma reserva da própria pessoa ("Minhas reservas"). queuePosition: 1 = próxima da fila; 0 = pronta; null = encerrada.
export interface MyReservation {
  id: string;
  bookId: string;
  title: string;
  author: string;
  code: string;
  coverUrl: string | null;
  status: ReservationStatus;
  createdAt: string;
  readyAt: string | null;
  // Só quando a reserva está pronta: até quando a pessoa pode retirar.
  expiresAt: string | null;
  queuePosition: number | null;
}

// A fila de um livro vista por quem está logado: só o tamanho (um número) e a situação da própria pessoa.
export interface BookReservationInfo {
  queueSize: number;
  myReservationId: string | null;
  myStatus: ReservationStatus | null;
  myPosition: number | null;
  myExpiresAt: string | null;
}

// Uma pessoa na fila, vista pela funcionária (detalhe do livro). Nome e telefone só ela vê.
export interface QueueEntry {
  id: string;
  userName: string;
  registration: string | null;
  phone: string | null;
  status: "waiting" | "ready";
  createdAt: string;
  expiresAt: string | null;
  // 1, 2, 3... entre os que esperam; 0 para quem já tem o exemplar guardado.
  position: number;
}

export type ReservationActionResult = { ok: true } | { ok: false; message: string };
