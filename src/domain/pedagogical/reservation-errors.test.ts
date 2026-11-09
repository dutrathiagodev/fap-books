import { describe, expect, it } from "vitest";
import {
  GENERIC_RESERVATION_ERROR,
  isFinalReservationError,
  RESERVATION_ERROR_MESSAGES,
  reservationErrorCode,
  reservationErrorMessage,
} from "./reservation-errors";

describe("erros da reserva pedagógica", () => {
  it("traduz cada código que o banco levanta", () => {
    for (const [code, message] of Object.entries(RESERVATION_ERROR_MESSAGES)) {
      expect(reservationErrorMessage({ message: code })).toBe(message);
    }
  });

  it("procura o código dentro de um texto maior", () => {
    expect(reservationErrorCode({ message: "ERROR: no_copy_available (livro x)" })).toBe("no_copy_available");
  });

  it("falta de permissão chega como SQLSTATE 42501", () => {
    expect(reservationErrorCode({ code: "42501", message: "permission denied for function" })).toBe("forbidden");
  });

  it("erro desconhecido vira a mensagem genérica, sem vazar o texto do banco", () => {
    expect(reservationErrorMessage({ message: "connection refused to 10.0.0.1" })).toBe(GENERIC_RESERVATION_ERROR);
    expect(reservationErrorMessage({})).toBe(GENERIC_RESERVATION_ERROR);
    expect(reservationErrorMessage(null)).toBe(GENERIC_RESERVATION_ERROR);
  });

  it("só erro de regra descarta a chave de idempotência", () => {
    expect(isFinalReservationError({ message: "already_decided" })).toBe(true);
    expect(isFinalReservationError({ code: "42501" })).toBe(true);
    expect(isFinalReservationError({ message: "fetch failed" })).toBe(false);
  });

  it("toda mensagem está em português e termina com ponto", () => {
    for (const message of Object.values(RESERVATION_ERROR_MESSAGES)) expect(message).toMatch(/\.$/);
  });
});
