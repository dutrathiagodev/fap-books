import { describe, expect, it } from "vitest";
import {
  addDays,
  bookTitlesSummary,
  daysInvalidMessage,
  daysTooManyMessage,
  DEFAULT_MAX_DAYS,
  FIELD_MESSAGES,
  formatInstantDate,
  formatPeriod,
  isIsoDate,
  MAX_BOOKS,
  parseDecisionNote,
  parseMaxDaysInput,
  parseQueueFilters,
  parseReservationInput,
  queueHref,
  queueSummary,
  todayInBrasilia,
} from "./reservation-rules";

const ID_A = "b0000000-0000-4000-8000-0000000000a1";
const ID_B = "b0000000-0000-4000-8000-0000000000b2";
const TODAY = "2026-11-08";
const valid = { bookIds: [ID_A], startDate: "2026-11-10", days: 30, purpose: "Redes I" };

describe("datas", () => {
  it("hoje é o dia de Brasília, não o de Greenwich", () => {
    // 01h de 09/11 em Greenwich ainda é noite de 08/11 em Brasília (UTC-3).
    expect(todayInBrasilia(new Date("2026-11-09T01:00:00Z"))).toBe("2026-11-08");
    expect(todayInBrasilia(new Date("2026-11-09T03:00:00Z"))).toBe("2026-11-09");
  });

  it("confere datas de verdade", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate("10/11/2026")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });

  it("soma dias atravessando mês e ano", () => {
    expect(addDays("2026-11-10", 30)).toBe("2026-12-10");
    expect(addDays("2026-12-20", 30)).toBe("2027-01-19");
  });

  it("mostra dd/mm/aaaa e o período com o dia da devolução", () => {
    expect(formatPeriod("2026-11-10", 30)).toBe("10/11/2026 a 10/12/2026 · 30 dias");
    expect(formatPeriod("2026-11-10", 1)).toBe("10/11/2026 a 11/11/2026 · 1 dia");
    expect(formatInstantDate("2026-11-09T01:00:00Z")).toBe("08/11/2026");
  });
});

describe("parseReservationInput", () => {
  it("aceita um pedido válido e limpa a disciplina", () => {
    const parsed = parseReservationInput({ ...valid, purpose: "  Redes   I \n" }, TODAY);
    expect(parsed).toEqual({ ok: true, values: { bookIds: [ID_A], startDate: "2026-11-10", days: 30, purpose: "Redes I" } });
  });

  it("disciplina é opcional", () => {
    const parsed = parseReservationInput({ ...valid, purpose: "   " }, TODAY);
    expect(parsed.ok && parsed.values.purpose).toBeNull();
  });

  it("aceita hoje como início e o prazo em texto (vem de um campo)", () => {
    expect(parseReservationInput({ ...valid, startDate: TODAY, days: "7" }, TODAY).ok).toBe(true);
  });

  it("prazo de 1 a 30 dias (RF-18)", () => {
    expect(parseReservationInput({ ...valid, days: 1 }, TODAY).ok).toBe(true);
    expect(parseReservationInput({ ...valid, days: 31 }, TODAY)).toEqual({ ok: false, errors: { days: FIELD_MESSAGES.daysTooMany } });
    for (const days of [0, -3, 2.5, "", "abc", null, undefined, Number.NaN]) {
      const parsed = parseReservationInput({ ...valid, days }, TODAY);
      expect(parsed.ok, String(days)).toBe(false);
    }
  });

  it("exige pelo menos um livro, de uuid válido e sem repetir", () => {
    expect(parseReservationInput({ ...valid, bookIds: [] }, TODAY)).toEqual({ ok: false, errors: { books: FIELD_MESSAGES.booksRequired } });
    expect(parseReservationInput({ ...valid, bookIds: "x" }, TODAY).ok).toBe(false);
    expect(parseReservationInput({ ...valid, bookIds: ["não-é-uuid"] }, TODAY).ok).toBe(false);
    expect(parseReservationInput({ ...valid, bookIds: [ID_A, ID_A] }, TODAY).ok).toBe(false);
    expect(parseReservationInput({ ...valid, bookIds: [ID_A, ID_B] }, TODAY).ok).toBe(true);
  });

  it(`aceita no máximo ${MAX_BOOKS} livros`, () => {
    const many = Array.from({ length: MAX_BOOKS + 1 }, (_, i) => `b0000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    expect(parseReservationInput({ ...valid, bookIds: many }, TODAY)).toEqual({ ok: false, errors: { books: FIELD_MESSAGES.booksTooMany } });
  });

  it("data de início: não vazia, não no passado e dentro de um ano", () => {
    expect(parseReservationInput({ ...valid, startDate: "" }, TODAY).ok).toBe(false);
    expect(parseReservationInput({ ...valid, startDate: "2026-02-31" }, TODAY).ok).toBe(false);
    expect(parseReservationInput({ ...valid, startDate: "2026-11-07" }, TODAY)).toEqual({ ok: false, errors: { startDate: FIELD_MESSAGES.startPast } });
    expect(parseReservationInput({ ...valid, startDate: "2027-11-08" }, TODAY).ok).toBe(true);
    expect(parseReservationInput({ ...valid, startDate: "2027-11-09" }, TODAY)).toEqual({ ok: false, errors: { startDate: FIELD_MESSAGES.startTooFar } });
  });

  it("disciplina com mais de 120 letras é recusada e controles viram espaço", () => {
    expect(parseReservationInput({ ...valid, purpose: "x".repeat(121) }, TODAY)).toEqual({ ok: false, errors: { purpose: FIELD_MESSAGES.purposeTooLong } });
    const parsed = parseReservationInput({ ...valid, purpose: "Redes\u0000I" }, TODAY);
    expect(parsed.ok && parsed.values.purpose).toBe("Redes I");
  });

  it("junta todos os erros de uma vez", () => {
    const parsed = parseReservationInput({ bookIds: [], startDate: "", days: 99, purpose: "" }, TODAY);
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && Object.keys(parsed.errors).sort()).toEqual(["books", "days", "startDate"]);
  });
});

describe("limite de dias configurável (card 0218)", () => {
  it("o padrão é 30 dias: 30 vale e 31 não", () => {
    expect(DEFAULT_MAX_DAYS).toBe(30);
    expect(parseReservationInput({ ...valid, days: 30 }, TODAY).ok).toBe(true);
    const parsed = parseReservationInput({ ...valid, days: 31 }, TODAY);
    expect(parsed.ok || parsed.errors.days).toBe(daysTooManyMessage(30));
  });

  it("com o limite em 45, 40 dias vale e 46 não, e a mensagem cita o limite do dia", () => {
    expect(parseReservationInput({ ...valid, days: 40 }, TODAY, 45).ok).toBe(true);
    const parsed = parseReservationInput({ ...valid, days: 46 }, TODAY, 45);
    expect(parsed.ok || parsed.errors.days).toBe("O prazo máximo é de 45 dias.");
  });

  it("com o limite em 7, 8 dias é recusado", () => {
    expect(parseReservationInput({ ...valid, days: 7 }, TODAY, 7).ok).toBe(true);
    expect(parseReservationInput({ ...valid, days: 8 }, TODAY, 7).ok).toBe(false);
  });

  it("prazo vazio ou zero pede o intervalo certo do dia", () => {
    const parsed = parseReservationInput({ ...valid, days: 0 }, TODAY, 45);
    expect(parsed.ok || parsed.errors.days).toBe(daysInvalidMessage(45));
  });

  it.each([["1", 1], ["30", 30], [" 45 ", 45], ["365", 365], [60, 60]])("a funcionária digita %s e vira %s", (raw, days) => {
    expect(parseMaxDaysInput(raw)).toEqual({ ok: true, days });
  });

  it.each(["", "0", "366", "-5", "3.5", "abc", "10 dias", "1e2", null, undefined, 0, 400])("recusa o limite %s", (raw) => {
    expect(parseMaxDaysInput(raw).ok).toBe(false);
  });
});

describe("parseDecisionNote", () => {
  it("recusa exige justificativa; aprovação não", () => {
    expect(parseDecisionNote("", true)).toEqual({ ok: false, message: "Informe a justificativa da recusa." });
    expect(parseDecisionNote("   ", true).ok).toBe(false);
    expect(parseDecisionNote(undefined, true).ok).toBe(false);
    expect(parseDecisionNote("", false)).toEqual({ ok: true, note: null });
    expect(parseDecisionNote("  Sem exemplares.  ", true)).toEqual({ ok: true, note: "Sem exemplares." });
  });

  it("limita a 500 letras", () => {
    expect(parseDecisionNote("x".repeat(501), true).ok).toBe(false);
    expect(parseDecisionNote("x".repeat(500), true).ok).toBe(true);
  });
});

describe("fila: endereço", () => {
  it("valor desconhecido cai no padrão", () => {
    expect(parseQueueFilters({})).toEqual({ filter: "pending", page: 1, detail: null });
    expect(parseQueueFilters({ status: "x", pagina: "-2", ver: "não-uuid" })).toEqual({ filter: "pending", page: 1, detail: null });
    expect(parseQueueFilters({ status: ["approved"], pagina: "3", ver: ID_A })).toEqual({ filter: "approved", page: 3, detail: ID_A });
  });

  it("o padrão não aparece no endereço", () => {
    expect(queueHref({ filter: "pending" })).toBe("/funcionario/reservas-pedagogicas");
    expect(queueHref({ filter: "rejected", page: 2, detail: ID_A })).toBe(`/funcionario/reservas-pedagogicas?status=rejected&pagina=2&ver=${ID_A}`);
  });

  it("resumo e lista de títulos", () => {
    expect(queueSummary(0, 0, 0)).toBe("Nenhuma solicitação");
    expect(queueSummary(1, 1, 1)).toBe("Mostrando 1-1 de 1 solicitação");
    expect(queueSummary(1, 10, 23)).toBe("Mostrando 1-10 de 23 solicitações");
    expect(bookTitlesSummary(["A"])).toBe("A");
    expect(bookTitlesSummary(["A", "B"])).toBe("A e B");
    expect(bookTitlesSummary(["A", "B", "C", "D"])).toBe("A, B e mais 2");
  });
});
