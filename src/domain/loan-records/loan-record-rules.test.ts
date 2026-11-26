import { describe, expect, it } from "vitest";
import type { LoanRecord, LoanRecordValues } from "@/types/loan-record";
import {
  categoriesOf,
  daysLate,
  filterRecords,
  formatLoanDate,
  hasErrors,
  isValidIsoDate,
  lateText,
  statusOf,
  summarize,
  todayIso,
  validateLoanValues,
} from "./loan-record-rules";

const TODAY = "2026-11-25";
const record = (over: Partial<LoanRecord>): LoanRecord => ({
  id: "1",
  bookTitle: "Dom Casmurro",
  author: "Machado de Assis",
  readerName: "Maria Souza",
  category: "Romance",
  loanedOn: "2026-11-10",
  dueOn: "2026-12-01",
  returnedOn: null,
  ...over,
});

const list: LoanRecord[] = [
  record({ id: "a" }),
  record({ id: "b", bookTitle: "Ciência e Fé", category: "Teologia", readerName: "João Álvares", dueOn: "2026-11-20" }),
  record({ id: "c", bookTitle: "Iracema", category: "Romance", returnedOn: "2026-11-18", dueOn: "2026-11-17" }),
];

describe("status e atraso", () => {
  it("no prazo é emprestado; prazo vencido e não devolvido é atrasado; devolvido nunca é atrasado", () => {
    expect(statusOf(list[0], TODAY)).toBe("borrowed");
    expect(statusOf(list[1], TODAY)).toBe("overdue");
    expect(statusOf(list[2], TODAY)).toBe("returned");
  });

  it("vence hoje ainda não é atraso; amanhã do prazo já é", () => {
    expect(statusOf(record({ dueOn: TODAY }), TODAY)).toBe("borrowed");
    expect(statusOf(record({ dueOn: "2026-11-24" }), TODAY)).toBe("overdue");
  });

  it("conta os dias de atraso (inclusive na virada do mês e do ano)", () => {
    expect(daysLate(list[1], TODAY)).toBe(5);
    expect(daysLate(record({ dueOn: "2026-12-30" }), "2027-01-02")).toBe(3);
    expect(daysLate(list[0], TODAY)).toBe(0);
    expect(daysLate(list[2], TODAY)).toBe(0);
  });

  it("texto do atraso no singular e no plural", () => {
    expect(lateText(1)).toBe("1 dia de atraso");
    expect(lateText(5)).toBe("5 dias de atraso");
  });
});

describe("resumo (contadores calculados da lista)", () => {
  it("total, em aberto (atrasados inclusive), devolvidos e atrasados", () => {
    expect(summarize(list, TODAY)).toEqual({ total: 3, open: 2, returned: 1, overdue: 1 });
  });

  it("lista vazia zera tudo e acompanha a lista quando ela muda", () => {
    expect(summarize([], TODAY)).toEqual({ total: 0, open: 0, returned: 0, overdue: 0 });
    expect(summarize(list.filter((item) => item.id !== "b"), TODAY)).toEqual({ total: 2, open: 1, returned: 1, overdue: 0 });
  });
});

describe("filtros", () => {
  const base = { status: "all", category: "", query: "" } as const;

  it("por status: emprestados são os em aberto (atrasados inclusive) e devolvidos os devolvidos", () => {
    expect(filterRecords(list, { ...base, status: "borrowed" }).map((item) => item.id)).toEqual(["a", "b"]);
    expect(filterRecords(list, { ...base, status: "returned" }).map((item) => item.id)).toEqual(["c"]);
    expect(filterRecords(list, base)).toHaveLength(3);
  });

  it("por categoria, sozinho e junto com o status", () => {
    expect(filterRecords(list, { ...base, category: "Romance" }).map((item) => item.id)).toEqual(["a", "c"]);
    expect(filterRecords(list, { ...base, category: "Romance", status: "returned" }).map((item) => item.id)).toEqual(["c"]);
  });

  it("busca por título ou leitor, sem acento e sem maiúsculas", () => {
    expect(filterRecords(list, { ...base, query: "ciencia" }).map((item) => item.id)).toEqual(["b"]);
    expect(filterRecords(list, { ...base, query: "ALVARES" }).map((item) => item.id)).toEqual(["b"]);
    expect(filterRecords(list, { ...base, query: "xyz" })).toEqual([]);
  });

  it("categorias da lista, sem repetir e em ordem", () => {
    expect(categoriesOf(list)).toEqual(["Romance", "Teologia"]);
  });
});

describe("validação do formulário", () => {
  const valid: LoanRecordValues = { bookTitle: " Dom Casmurro ", author: "Machado", readerName: "Maria", category: "Romance", loanedOn: "2026-11-10", dueOn: "2026-11-17" };

  it("formulário completo é aceito", () => {
    expect(hasErrors(validateLoanValues(valid))).toBe(false);
  });

  it("todos os campos são obrigatórios", () => {
    const errors = validateLoanValues({ bookTitle: " ", author: "", readerName: "", category: "", loanedOn: "", dueOn: "" });
    expect(Object.keys(errors).sort()).toEqual(["author", "bookTitle", "category", "dueOn", "loanedOn", "readerName"]);
  });

  it("a devolução não pode ser antes do empréstimo; no mesmo dia pode", () => {
    expect(validateLoanValues({ ...valid, dueOn: "2026-11-09" }).dueOn).toMatch(/antes/);
    expect(hasErrors(validateLoanValues({ ...valid, dueOn: "2026-11-10" }))).toBe(false);
  });

  it("rejeita categoria fora da lista, data impossível e texto longo demais", () => {
    expect(validateLoanValues({ ...valid, category: "Culinária" }).category).toBeDefined();
    expect(validateLoanValues({ ...valid, loanedOn: "2026-02-30" }).loanedOn).toBe("Data inválida.");
    expect(validateLoanValues({ ...valid, author: "a".repeat(121) }).author).toBeDefined();
  });
});

describe("datas", () => {
  it("valida aaaa-mm-dd de verdade", () => {
    expect(isValidIsoDate("2026-02-28")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("25/11/2026")).toBe(false);
  });

  it("formata para o padrão brasileiro e lê o dia local", () => {
    expect(formatLoanDate("2026-11-05")).toBe("05/11/2026");
    expect(todayIso(new Date(2026, 10, 5, 23, 59))).toBe("2026-11-05");
  });
});
