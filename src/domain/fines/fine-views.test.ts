import { describe, expect, it } from "vitest";
import { toFineView, type FineRow } from "./fine-views";

const open: FineRow = {
  id: "f1",
  days_late: 4,
  amount_cents: 400,
  paid_at: null,
  profiles: { full_name: "Lucas Andrade Martins", registration: "20180849" },
  payer: null,
  loans: { due_at: "2026-03-14T23:59:00-03:00", books: { title: "Código Limpo", code: "T-120" } },
};

describe("toFineView", () => {
  it("multa em aberto: valor formatado, sem quem pagou", () => {
    expect(toFineView(open)).toEqual({
      id: "f1",
      userName: "Lucas Andrade Martins",
      initials: "LM",
      registration: "20180849",
      bookTitle: "Código Limpo",
      code: "T-120",
      dueOn: "14/03/2026",
      daysLate: 4,
      amountCents: 400,
      amountLabel: "R$ 4,00",
      paid: false,
      paidAt: null,
      paidBy: null,
    });
  });

  it("multa paga: data e hora da baixa e quem registrou", () => {
    const view = toFineView({ ...open, paid_at: "2026-03-15T13:42:00Z", payer: { full_name: "Mariana Silva" } });
    expect(view.paid).toBe(true);
    expect(view.paidAt).toBe("15/03/2026, 10:42");
    expect(view.paidBy).toBe("Mariana Silva");
  });

  it("quem registrou foi removido: mostra traço, sem inventar autor", () => {
    expect(toFineView({ ...open, paid_at: "2026-03-15T13:42:00Z" }).paidBy).toBe("—");
  });

  it("usuário, livro ou empréstimo ausentes não quebram a lista", () => {
    const view = toFineView({ ...open, profiles: null, loans: null });
    expect(view.userName).toBe("Usuário removido");
    expect(view.registration).toBe("—");
    expect(view.bookTitle).toBe("Livro removido");
    expect(view.dueOn).toBe("—");
  });
});
