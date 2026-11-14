import { describe, expect, it } from "vitest";
import {
  buildStudentSummary,
  sortLoansByUrgency,
  studentNoticeSentence,
  toMyFineView,
  toMyLoanView,
  toMyReservationView,
  type MyLoanRow,
} from "./student-rules";

// Meio-dia de 10/11/2026 em Brasília.
const NOW = new Date("2026-11-10T15:00:00Z");
const loan = (due: string, over: Partial<MyLoanRow> = {}): MyLoanRow => ({
  id: "l1",
  borrowed_at: "2026-11-03T15:00:00Z",
  due_at: due,
  renewals: 0,
  books: { title: "Dom Casmurro", code: "R-1" },
  ...over,
});

describe("toMyLoanView", () => {
  it("prazo longe: sem selo, só a data, e pode renovar", () => {
    const view = toMyLoanView(loan("2026-11-17T15:00:00Z"), NOW, 0);
    expect(view.status).toBeNull();
    expect(view.whenLabel).toBe("Vence em 17/11/2026");
    expect(view.renewBlocked).toBeNull();
    expect(view.newDueOn).toBe("24/11/2026");
    expect(view.renewalsLabel).toBe("0 de 3");
  });

  it("vence hoje e em 2 dias: avisos de prazo", () => {
    expect(toMyLoanView(loan("2026-11-10T22:00:00Z"), NOW, 0)).toMatchObject({ status: "today", whenLabel: "Vence hoje" });
    expect(toMyLoanView(loan("2026-11-12T15:00:00Z"), NOW, 0)).toMatchObject({ status: "soon", whenLabel: "Faltam 2 dias" });
  });

  it("atrasado: conta os dias e bloqueia a renovação", () => {
    const view = toMyLoanView(loan("2026-11-06T15:00:00Z"), NOW, 0);
    expect(view.status).toBe("overdue");
    expect(view.whenLabel).toBe("4 dias de atraso");
    expect(view.renewBlocked).toBe("Livro em atraso não pode ser renovado. Devolva o livro na biblioteca.");
    expect(view.renewBlocked).not.toMatch(/registre/);
  });

  it("multa em aberto bloqueia a renovação mesmo sem atraso", () => {
    expect(toMyLoanView(loan("2026-11-17T15:00:00Z"), NOW, 300).renewBlocked).toMatch(/multa/);
  });

  it("3 renovações já feitas bloqueiam", () => {
    expect(toMyLoanView(loan("2026-11-17T15:00:00Z", { renewals: 3 }), NOW, 0).renewBlocked).toMatch(/3 vezes/);
  });

  it("livro removido não quebra a linha", () => {
    expect(toMyLoanView(loan("2026-11-17T15:00:00Z", { books: null }), NOW, 0).bookTitle).toBe("Livro removido");
  });
});

describe("buildStudentSummary", () => {
  const loans = [{ status: "overdue" as const }, { status: "today" as const }, { status: null }];
  it("conta livros, restantes e prazos; o limite é 3", () => {
    expect(buildStudentSummary({ loans, graduating: false, openFineCents: 400 })).toMatchObject({
      borrowed: 3,
      limit: 3,
      remaining: 0,
      overdue: 1,
      dueToday: 1,
      dueSoon: 0,
      openFineLabel: "R$ 4,00",
    });
  });
  it("formando com 4 livros chegou ao limite; aluno comum com 3 também", () => {
    const four = [{ status: null }, { status: null }, { status: null }, { status: null }];
    expect(buildStudentSummary({ loans: four, graduating: true, openFineCents: 0 })).toMatchObject({ borrowed: 4, limit: 4, remaining: 0 });
  });
  it("formando tem limite 4", () => {
    expect(buildStudentSummary({ loans, graduating: true, openFineCents: 0 })).toMatchObject({ limit: 4, remaining: 1 });
  });
});

describe("studentNoticeSentence", () => {
  it("sem prazo próximo, nada a avisar", () => {
    expect(studentNoticeSentence({ dueToday: 0, dueSoon: 0, overdue: 0 })).toBeNull();
  });
  it("junta os que vencem e os atrasados", () => {
    expect(studentNoticeSentence({ dueToday: 1, dueSoon: 1, overdue: 1 })).toBe("Atenção: 2 livros vencem em até 2 dias e 1 está atrasado.");
    expect(studentNoticeSentence({ dueToday: 1, dueSoon: 0, overdue: 0 })).toBe("Atenção: 1 livro vence em até 2 dias.");
  });
});

describe("sortLoansByUrgency", () => {
  it("atrasado, hoje, a vencer e depois o resto, sem alterar a lista original", () => {
    const list = [{ status: null }, { status: "soon" as const }, { status: "overdue" as const }, { status: "today" as const }];
    expect(sortLoansByUrgency(list).map((l) => l.status)).toEqual(["overdue", "today", "soon", null]);
    expect(list[0].status).toBeNull();
  });
});

describe("reservas e multas", () => {
  it("reserva na fila e pronta têm texto próprio", () => {
    const row = { id: "r1", created_at: "2026-11-09T15:00:00Z", books: { title: "A", code: "X" } };
    expect(toMyReservationView({ ...row, status: "waiting" })).toMatchObject({ statusLabel: "Na fila", requestedOn: "09/11/2026" });
    expect(toMyReservationView({ ...row, status: "ready" }).statusLabel).toBe("Pronta para retirar");
  });
  it("multa em aberto e paga", () => {
    const row = { id: "f1", days_late: 4, amount_cents: 400, paid_at: null, loans: { due_at: "2026-11-06T15:00:00Z", books: { title: "A", code: "X" } } };
    expect(toMyFineView(row)).toMatchObject({ amountLabel: "R$ 4,00", paid: false, dueOn: "06/11/2026", paidOn: null });
    expect(toMyFineView({ ...row, paid_at: "2026-11-10T15:00:00Z" })).toMatchObject({ paid: true, paidOn: "10/11/2026" });
  });
});
