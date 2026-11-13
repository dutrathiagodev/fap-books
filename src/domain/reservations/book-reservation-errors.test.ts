import { describe, expect, it } from "vitest";
import {
  GENERIC_RESERVATION_ERROR,
  RESERVATION_ERROR_MESSAGES,
  reservationErrorCode,
  reservationErrorMessage,
  type ReservationErrorCode,
} from "./book-reservation-errors";

describe("reservationErrorMessage", () => {
  it.each(Object.keys(RESERVATION_ERROR_MESSAGES) as ReservationErrorCode[])("%s vira a frase da tela", (code) => {
    const message = reservationErrorMessage({ message: code, code: "P0001" });
    expect(message).toBe(RESERVATION_ERROR_MESSAGES[code]);
    expect(message).not.toContain(code);
  });

  it("permissão negada (42501) vira forbidden", () => {
    expect(reservationErrorCode({ message: "permission denied", code: "42501" })).toBe("forbidden");
  });

  it("acha o código dentro de um texto maior", () => {
    expect(reservationErrorCode({ message: "erro", details: "falha: already_reserved no livro" })).toBe("already_reserved");
  });

  it("erro desconhecido ou nulo vira a frase genérica, sem vazar o texto do banco", () => {
    expect(reservationErrorMessage({ message: 'relation "x" does not exist' })).toBe(GENERIC_RESERVATION_ERROR);
    expect(reservationErrorMessage(null)).toBe(GENERIC_RESERVATION_ERROR);
    expect(reservationErrorMessage(undefined)).toBe(GENERIC_RESERVATION_ERROR);
  });
});
