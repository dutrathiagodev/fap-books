import { describe, expect, it } from "vitest";
import {
  daysLateBetween,
  formatCents,
  formatHistoryDate,
  formatIsoDate,
  historyHref,
  historyStatus,
  historySummary,
  parseHistoryFilters,
  parseIsoDate,
  periodBounds,
  periodError,
  toHistoryRowView,
  type HistoryRow,
} from "./history-rules";

const UUID = "3f2b8c1e-5a4d-4e8b-9c1a-0b2d3e4f5a6b";
const NOW = new Date("2026-11-08T15:00:00Z");

describe("parseHistoryFilters", () => {
  it("sem parâmetros usa o padrão", () => {
    expect(parseHistoryFilters({})).toEqual({
      tab: "usuario", query: "", subjectId: null, from: null, to: null, status: "all", page: 1,
    });
  });

  it("lê a aba de livros com o livro escolhido, e ignora o parâmetro da outra aba", () => {
    expect(parseHistoryFilters({ aba: "livro", l: UUID, u: "x" }).subjectId).toBe(UUID);
    expect(parseHistoryFilters({ aba: "livro", u: UUID }).subjectId).toBeNull();
    expect(parseHistoryFilters({ u: UUID }).subjectId).toBe(UUID);
  });

  it("descarta valores inválidos em vez de falhar", () => {
    const filters = parseHistoryFilters({ aba: "x", u: "não-é-uuid", de: "31/12/2026", ate: "2026-02-30", status: "hack", pagina: "-3" });
    expect(filters).toMatchObject({ tab: "usuario", subjectId: null, from: null, to: null, status: "all", page: 1 });
  });

  it("limita a página, corta a busca e tira controles", () => {
    expect(parseHistoryFilters({ pagina: "999999999" }).page).toBe(10_000);
    expect(parseHistoryFilters({ q: `  Maria\u0000  da   Silva* ` }).query).toBe("Maria da Silva");
    expect(parseHistoryFilters({ q: "a" }).query).toBe("");
    expect(parseHistoryFilters({ q: "x".repeat(200) }).query).toHaveLength(60);
  });

  it("usa só o primeiro valor quando o parâmetro se repete", () => {
    expect(parseHistoryFilters({ status: ["open", "returned"] }).status).toBe("open");
  });
});

describe("datas", () => {
  it("parseIsoDate aceita só datas que existem", () => {
    expect(parseIsoDate("2026-02-28")).toBe("2026-02-28");
    expect(parseIsoDate("2024-02-29")).toBe("2024-02-29");
    expect(parseIsoDate("2026-02-29")).toBeNull();
    expect(parseIsoDate("2026-13-01")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
  });

  it("formata dd/mm/aaaa", () => {
    expect(formatIsoDate("2026-02-01")).toBe("01/02/2026");
    expect(formatHistoryDate(new Date("2026-10-27T01:30:00Z"))).toBe("26/10/2026");
  });

  it("o período vira instantes de Brasília: início inclusivo, fim no começo do dia seguinte", () => {
    expect(periodBounds({ from: "2026-02-01", to: "2026-02-28" })).toEqual({
      start: "2026-02-01T00:00:00-03:00",
      end: "2026-03-01T00:00:00-03:00",
    });
    expect(periodBounds({ from: null, to: "2026-12-31" })).toEqual({ start: null, end: "2027-01-01T00:00:00-03:00" });
  });

  it("período trocado dá erro e não filtra", () => {
    const swapped = { from: "2026-03-01", to: "2026-02-01" };
    expect(periodError(swapped)).toMatch(/inicial/);
    expect(periodBounds(swapped)).toEqual({ start: null, end: null });
    expect(periodError({ from: "2026-02-01", to: "2026-02-01" })).toBeNull();
  });
});

describe("daysLateBetween e formatCents", () => {
  const due = new Date("2026-10-20T15:00:00Z");
  it("devolver no dia do prazo não é atraso; o dia seguinte é 1 dia", () => {
    expect(daysLateBetween(due, new Date("2026-10-20T23:00:00-03:00"))).toBe(0);
    expect(daysLateBetween(due, new Date("2026-10-21T08:00:00-03:00"))).toBe(1);
    expect(daysLateBetween(due, new Date("2026-10-10T12:00:00Z"))).toBe(0);
  });
  it("escreve reais", () => {
    expect(formatCents(800)).toBe("R$ 8,00");
    expect(formatCents(184250)).toBe("R$ 1.842,50");
  });
});

describe("historyStatus", () => {
  const due = new Date("2026-11-10T12:00:00Z");
  it("em aberto, em atraso, devolvido e devolvido com atraso", () => {
    expect(historyStatus(due, null, false, NOW)).toBe("open");
    expect(historyStatus(new Date("2026-11-01T12:00:00Z"), null, false, NOW)).toBe("overdue");
    expect(historyStatus(due, new Date("2026-11-09T12:00:00Z"), false, NOW)).toBe("returned");
    expect(historyStatus(due, new Date("2026-11-12T12:00:00Z"), false, NOW)).toBe("returned_late");
    expect(historyStatus(due, new Date("2026-11-09T12:00:00Z"), true, NOW)).toBe("returned_late");
  });
});

describe("toHistoryRowView", () => {
  const base: HistoryRow = {
    id: "1",
    borrowed_at: "2026-10-01T15:00:00Z",
    due_at: "2026-10-08T15:00:00Z",
    returned_at: null,
    renewals: 1,
    profiles: { full_name: "Maria da Silva", registration: "20240123" },
    books: { title: "Dom Casmurro", code: "T-100" },
    fines: null,
  };

  it("empréstimo vencido e em aberto", () => {
    const view = toHistoryRowView(base, NOW);
    expect(view).toMatchObject({
      status: "overdue", statusLabel: "Em atraso", borrowedOn: "01/10/2026", dueOn: "08/10/2026",
      returnedOn: null, initials: "MS", fineLabel: "Sem multa", fineNote: null,
    });
    expect(view.daysLate).toBe(31);
  });

  it("devolvido com atraso mostra a multa e se está paga", () => {
    const row = { ...base, returned_at: "2026-10-12T15:00:00Z", fines: { amount_cents: 400, days_late: 4, paid_at: null } };
    expect(toHistoryRowView(row, NOW)).toMatchObject({
      status: "returned_late", returnedOn: "12/10/2026", fineLabel: "R$ 4,00", fineNote: "Em aberto", daysLate: 4,
    });
    const paid = { ...row, fines: [{ amount_cents: 400, days_late: 4, paid_at: "2026-10-13T12:00:00Z" }] };
    expect(toHistoryRowView(paid, NOW).fineNote).toBe("Paga");
  });

  it("pessoa ou livro removidos não quebram a linha", () => {
    const view = toHistoryRowView({ ...base, profiles: null, books: null }, NOW);
    expect(view).toMatchObject({ userName: "Usuário removido", registration: "—", bookTitle: "Livro removido", code: "—" });
  });
});

describe("historyHref e historySummary", () => {
  const base = parseHistoryFilters({});
  it("só entra no endereço o que foge do padrão", () => {
    expect(historyHref(base)).toBe("/funcionario/historico");
    expect(historyHref(base, { tab: "livro", subjectId: UUID, from: "2026-02-01", status: "fined", page: 3 })).toBe(
      `/funcionario/historico?aba=livro&l=${UUID}&de=2026-02-01&status=fined&pagina=3`,
    );
    expect(historyHref(base, { subjectId: UUID })).toBe(`/funcionario/historico?u=${UUID}`);
  });
  it("escapa a busca no endereço", () => {
    expect(historyHref(base, { query: "a&b=c" })).toBe("/funcionario/historico?q=a%26b%3Dc");
  });
  it("resumo da paginação", () => {
    expect(historySummary(1, 10, 10, 143)).toBe("Mostrando 1-10 de 143 empréstimos");
    expect(historySummary(2, 10, 1, 11)).toBe("Mostrando 11-11 de 11 empréstimos");
    expect(historySummary(1, 10, 1, 1)).toBe("Mostrando 1-1 de 1 empréstimo");
  });
});
