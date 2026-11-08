import { describe, expect, it } from "vitest";
import {
  calculateDaysLate,
  calculateDueDate,
  calculateFine,
  canBorrow,
  fineSentence,
  formatLoanDate,
  formatReais,
  limitNotice,
  loanBlockReason,
  loanLimitFor,
  renewBlockReason,
  renewedDueDate,
} from "./loan-rules";

// Horários em Brasília (UTC-3).
const at = (iso: string) => new Date(`${iso}-03:00`);

describe("limite de livros", () => {
  it("é 3 para todos e 4 para formandos", () => {
    expect(loanLimitFor()).toBe(3);
    expect(loanLimitFor(true)).toBe(4);
  });
  it("o 3º empréstimo passa e o 4º bloqueia", () => {
    expect(canBorrow(2)).toBe(true);
    expect(canBorrow(3)).toBe(false);
  });
  it("formando: o 4º passa e o 5º bloqueia", () => {
    expect(canBorrow(3, true)).toBe(true);
    expect(canBorrow(4, true)).toBe(false);
  });
});

describe("prazo de devolução", () => {
  it("é a retirada mais 7 dias", () => {
    expect(formatLoanDate(calculateDueDate(at("2026-10-27T10:00:00")))).toBe("03/11/2026");
  });
  it("aceita outro prazo (reserva pedagógica)", () => {
    expect(formatLoanDate(calculateDueDate(at("2026-10-27T10:00:00"), 30))).toBe("26/11/2026");
  });
  it("atravessa o fim do mês e do ano", () => {
    expect(formatLoanDate(calculateDueDate(at("2026-12-28T09:00:00")))).toBe("04/01/2027");
  });
  it("renovar soma 7 dias ao prazo atual (03/11 vira 10/11)", () => {
    expect(formatLoanDate(renewedDueDate(at("2026-11-03T10:00:00")))).toBe("10/11/2026");
  });
  it("renovar de novo soma mais 7 dias ao prazo já renovado", () => {
    expect(formatLoanDate(renewedDueDate(renewedDueDate(at("2026-11-03T10:00:00"))))).toBe("17/11/2026");
  });
  it("o novo prazo é sempre diferente do atual, mesmo renovando antes da hora", () => {
    const due = at("2026-11-15T10:00:00");
    expect(renewedDueDate(due).getTime()).toBeGreaterThan(due.getTime());
    expect(formatLoanDate(renewedDueDate(due))).toBe("22/11/2026");
  });
  it("a data da tela usa o dia de Brasília, mesmo perto da meia-noite", () => {
    expect(formatLoanDate(at("2026-10-27T23:30:00"))).toBe("27/10/2026");
  });
});

describe("atraso e multa", () => {
  const due = at("2026-10-23T14:00:00");

  it("devolver no dia do prazo, a qualquer hora, não é atraso", () => {
    expect(calculateDaysLate(due, at("2026-10-23T23:59:00"))).toBe(0);
    expect(calculateFine(due, at("2026-10-23T23:59:00"))).toEqual({ daysLate: 0, amountCents: 0 });
  });
  it("devolver antes do prazo não tem multa", () => {
    expect(calculateFine(due, at("2026-10-20T09:00:00"))).toEqual({ daysLate: 0, amountCents: 0 });
  });
  it("o dia seguinte já é 1 dia de atraso: R$ 1,00", () => {
    expect(calculateFine(due, at("2026-10-24T00:10:00"))).toEqual({ daysLate: 1, amountCents: 100 });
  });
  it("4 dias de atraso = R$ 4,00 (caso do Figma)", () => {
    expect(calculateFine(due, at("2026-10-27T10:00:00"))).toEqual({ daysLate: 4, amountCents: 400 });
  });
  it("conta pelo calendário, não por horas corridas", () => {
    // 22 h depois do prazo, mas já no dia seguinte.
    expect(calculateDaysLate(at("2026-10-23T23:00:00"), at("2026-10-24T01:00:00"))).toBe(1);
  });
  it("escreve a frase do aviso", () => {
    expect(fineSentence(4)).toBe("multa calculada de R$ 1,00 × 4 dias = R$ 4,00");
    expect(fineSentence(1)).toBe("multa calculada de R$ 1,00 × 1 dia = R$ 1,00");
  });
  it("formata reais", () => {
    expect(formatReais(800)).toBe("R$ 8,00");
    expect(formatReais(0)).toBe("R$ 0,00");
  });
});

describe("loanBlockReason", () => {
  const ok = { activeLoans: 2, openFineCents: 0, hasOverdueLoan: false, hasThisBook: false, freeCopies: 1 };

  it("libera quem está dentro de todas as regras", () => {
    expect(loanBlockReason(ok)).toBeNull();
  });
  it("bloqueia com multa em aberto, mesmo com o resto em ordem", () => {
    expect(loanBlockReason({ ...ok, openFineCents: 800 })).toBe("open_fine");
  });
  it("bloqueia com livro em atraso", () => {
    expect(loanBlockReason({ ...ok, hasOverdueLoan: true })).toBe("overdue_loan");
  });
  it("bloqueia no limite e libera formando com o mesmo número", () => {
    expect(loanBlockReason({ ...ok, activeLoans: 3 })).toBe("limit_reached");
    expect(loanBlockReason({ ...ok, activeLoans: 3, graduating: true })).toBeNull();
    expect(loanBlockReason({ ...ok, activeLoans: 4, graduating: true })).toBe("limit_reached");
  });
  it("bloqueia o mesmo livro em dobro e o livro sem exemplar livre", () => {
    expect(loanBlockReason({ ...ok, hasThisBook: true })).toBe("already_has_book");
    expect(loanBlockReason({ ...ok, freeCopies: 0 })).toBe("book_unavailable");
  });
  it("multa vem antes do limite", () => {
    expect(loanBlockReason({ ...ok, activeLoans: 3, openFineCents: 100 })).toBe("open_fine");
  });
});

describe("limitNotice", () => {
  it("diz quantos livros restam e o prazo", () => {
    expect(limitNotice(2)).toBe("Limite de 3 livros por usuário: restam 1. Prazo padrão de 7 dias.");
    expect(limitNotice(2, true)).toBe("Limite de 4 livros por usuário: restam 2. Prazo padrão de 7 dias.");
  });
  it("nunca mostra restam negativo", () => {
    expect(limitNotice(9)).toContain("restam 0");
  });
});

describe("renewBlockReason", () => {
  const now = at("2026-11-02T10:00:00");
  const base = { renewals: 1, dueAt: at("2026-11-03T10:00:00"), now, openFineCents: 0 };

  it("permite renovar dentro do prazo e da quantidade", () => {
    expect(renewBlockReason(base)).toBeNull();
  });
  it("permite a 3ª renovação e bloqueia a 4ª", () => {
    expect(renewBlockReason({ ...base, renewals: 2 })).toBeNull();
    expect(renewBlockReason({ ...base, renewals: 3 })).toBe("limit");
  });
  it("bloqueia empréstimo em atraso e usuário com multa", () => {
    expect(renewBlockReason({ ...base, dueAt: at("2026-10-30T10:00:00") })).toBe("overdue");
    expect(renewBlockReason({ ...base, openFineCents: 100 })).toBe("open_fine");
  });
  it("no próprio dia, antes da hora do prazo, ainda renova; depois da hora, venceu", () => {
    expect(renewBlockReason({ ...base, dueAt: at("2026-11-02T18:00:00") })).toBeNull();
    expect(renewBlockReason({ ...base, dueAt: at("2026-11-02T09:00:00") })).toBe("overdue");
  });
});
