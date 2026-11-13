import { describe, expect, it } from "vitest";
import {
  isActiveReservation,
  pickupDeadlineSentence,
  queuePositionSentence,
  queueSizeSentence,
  RESERVATION_PICKUP_DAYS,
  RESERVATION_STATUS_LABELS,
  reserveButtonLabel,
} from "./book-reservation-rules";

describe("fila de espera: textos e contas", () => {
  it("o prazo de retirada é de 2 dias (o mesmo do banco)", () => {
    expect(RESERVATION_PICKUP_DAYS).toBe(2);
  });

  it("só reserva na fila ou pronta é ativa", () => {
    expect(isActiveReservation("waiting")).toBe(true);
    expect(isActiveReservation("ready")).toBe(true);
    for (const status of ["fulfilled", "cancelled", "expired"] as const) expect(isActiveReservation(status)).toBe(false);
  });

  it("todo status tem rótulo em português", () => {
    expect(Object.keys(RESERVATION_STATUS_LABELS).sort()).toEqual(["cancelled", "expired", "fulfilled", "ready", "waiting"]);
    expect(RESERVATION_STATUS_LABELS.ready).toBe("Pronta para retirada");
  });

  it.each([
    [1, "Você é o próximo da fila."],
    [2, "Você é o 2º da fila."],
    [5, "Você é o 5º da fila."],
  ])("posição %s", (position, text) => {
    expect(queuePositionSentence(position)).toBe(text);
  });

  it.each([
    [0, "Ninguém na fila de espera."],
    [1, "1 pessoa na fila de espera."],
    [3, "3 pessoas na fila de espera."],
  ])("tamanho da fila %s", (size, text) => {
    expect(queueSizeSentence(size)).toBe(text);
  });

  it("a data limite sai no calendário de Brasília", () => {
    expect(pickupDeadlineSentence("2026-11-15T14:00:00-03:00")).toBe("Retire até 15/11/2026.");
    // 01h UTC ainda é o dia anterior em Brasília.
    expect(pickupDeadlineSentence("2026-11-16T01:00:00Z")).toBe("Retire até 15/11/2026.");
  });

  it("o primeiro pede a reserva; os seguintes entram na lista de espera", () => {
    expect(reserveButtonLabel(0)).toBe("Solicitar reserva");
    expect(reserveButtonLabel(2)).toBe("Entrar na lista de espera");
  });
});
