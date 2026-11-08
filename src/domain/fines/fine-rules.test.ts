import { describe, expect, it } from "vitest";
import {
  calculateDaysLate,
  calculateFine,
  cleanFineQuery,
  fineHref,
  fineSummary,
  formatDays,
  formatFineDate,
  formatFineDateTime,
  formatReais,
  parseFineFilters,
  receivedText,
} from "./fine-rules";

// Brasília é UTC-3 o ano todo (sem horário de verão desde 2019): "23:59 em Brasília" é 02:59 UTC do dia seguinte.
const due = new Date("2026-03-10T23:59:00-03:00");

describe("calculateFine (mesma regra do banco, return_loan)", () => {
  it("devolver no dia do prazo, a qualquer hora, não é atraso", () => {
    expect(calculateFine(due, new Date("2026-03-10T00:01:00-03:00"))).toEqual({ daysLate: 0, amountCents: 0 });
    expect(calculateFine(due, new Date("2026-03-10T23:59:59-03:00"))).toEqual({ daysLate: 0, amountCents: 0 });
  });

  it("devolver antes do prazo não gera multa", () => {
    expect(calculateFine(due, new Date("2026-03-05T10:00:00-03:00"))).toEqual({ daysLate: 0, amountCents: 0 });
  });

  it("o dia seguinte já é 1 dia (R$ 1,00), mesmo com poucos minutos de diferença", () => {
    expect(calculateFine(due, new Date("2026-03-11T00:00:00-03:00"))).toEqual({ daysLate: 1, amountCents: 100 });
  });

  it("vários dias: R$ 1,00 por dia corrido", () => {
    expect(calculateFine(due, new Date("2026-03-15T09:00:00-03:00"))).toEqual({ daysLate: 5, amountCents: 500 });
    expect(calculateFine(due, new Date("2026-03-18T09:00:00-03:00"))).toEqual({ daysLate: 8, amountCents: 800 });
  });

  it("fim de semana, feriado e recesso contam como dia de atraso (sem desconto)", () => {
    // 10/03/2026 é terça; 14 e 15/03 são sábado e domingo: 15/03 = 5 dias.
    expect(calculateDaysLate(due, new Date("2026-03-15T12:00:00-03:00"))).toBe(5);
  });

  it("o dia conta pelo calendário de Brasília, não pelo UTC", () => {
    // 22:00 em Brasília do dia 10 já é 01:00 UTC do dia 11: continua no prazo.
    expect(calculateDaysLate(due, new Date("2026-03-11T01:00:00Z"))).toBe(0);
    // 21:00 em Brasília do dia 11 é 00:00 UTC do dia 12: é 1 dia, não 2.
    expect(calculateDaysLate(due, new Date("2026-03-12T00:00:00Z"))).toBe(1);
  });

  it("atravessa o virar do mês e do ano", () => {
    expect(calculateDaysLate(new Date("2026-12-30T12:00:00-03:00"), new Date("2027-01-02T08:00:00-03:00"))).toBe(3);
  });
});

describe("formatação", () => {
  it("moeda em reais com vírgula", () => {
    expect(formatReais(0)).toBe("R$ 0,00");
    expect(formatReais(800)).toBe("R$ 8,00");
    expect(formatReais(105)).toBe("R$ 1,05");
    expect(formatReais(123456)).toBe("R$ 1.234,56");
  });

  it("dias no singular e no plural", () => {
    expect(formatDays(1)).toBe("1 dia");
    expect(formatDays(4)).toBe("4 dias");
  });

  it("datas dd/mm/aaaa no fuso de Brasília", () => {
    expect(formatFineDate(new Date("2026-03-15T02:30:00Z"))).toBe("14/03/2026");
    expect(formatFineDateTime(new Date("2026-03-15T13:42:00Z"))).toBe("15/03/2026, 10:42");
    expect(formatFineDateTime(new Date("2026-03-15T03:05:00Z"))).toBe("15/03/2026, 00:05");
  });

  it("frase da confirmação do modal", () => {
    expect(receivedText(800)).toBe("Recebi R$ 8,00 presencialmente");
  });

  it("resumo da lista", () => {
    expect(fineSummary(1, 4, 18, 2400)).toBe("Mostrando 1-4 de 18 multas · Total em aberto no balcão: R$ 24,00");
    expect(fineSummary(1, 1, 1, 100)).toBe("Mostrando 1-1 de 1 multa · Total em aberto no balcão: R$ 1,00");
    expect(fineSummary(0, 0, 0, 0)).toBe("Nenhuma multa · Total em aberto no balcão: R$ 0,00");
  });
});

describe("filtros do endereço", () => {
  it("o padrão é Em aberto, sem busca, página 1", () => {
    expect(parseFineFilters({})).toEqual({ filter: "open", query: "", page: 1 });
  });

  it("aceita os filtros conhecidos e a primeira página válida", () => {
    expect(parseFineFilters({ status: "paid", q: " Ana  Souza ", pagina: "3" })).toEqual({ filter: "paid", query: "Ana Souza", page: 3 });
    expect(parseFineFilters({ status: "all" }).filter).toBe("all");
  });

  it("valor inválido do navegador cai no padrão", () => {
    expect(parseFineFilters({ status: "drop table", pagina: "-2" })).toEqual({ filter: "open", query: "", page: 1 });
    expect(parseFineFilters({ pagina: "abc" }).page).toBe(1);
    expect(parseFineFilters({ pagina: "99999999" }).page).toBe(10000);
    expect(parseFineFilters({ status: ["paid", "all"] }).filter).toBe("paid");
  });

  it("a busca perde controles e '*', e tem no máximo 60 letras", () => {
    expect(cleanFineQuery("a*b\u0000c")).toBe("a b c");
    expect(cleanFineQuery("x".repeat(100))).toHaveLength(60);
  });

  it("monta o endereço sem repetir o padrão", () => {
    expect(fineHref({})).toBe("/funcionario/multas");
    expect(fineHref({ filter: "open", page: 1 })).toBe("/funcionario/multas");
    expect(fineHref({ filter: "paid", query: "ana", page: 2 })).toBe("/funcionario/multas?q=ana&status=paid&pagina=2");
  });
});
