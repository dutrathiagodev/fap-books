import { describe, expect, it } from "vitest";
import { renewalsLabel, renewPanelRows, toOpenLoanView, type OpenLoanRow } from "./loan-views";

const now = new Date("2026-10-27T13:00:00-03:00");
const row: OpenLoanRow = {
  id: "l1",
  user_id: "u1",
  borrowed_at: "2026-10-16T10:00:00-03:00",
  due_at: "2026-10-23T10:00:00-03:00",
  renewals: 1,
  profiles: { full_name: "Lucas Andrade Martins", registration: "202201849" },
  books: { title: "Código Limpo", code: "48291" },
};

describe("toOpenLoanView", () => {
  it("atrasado: dias, multa de R$ 1,00 por dia e renovação bloqueada", () => {
    const view = toOpenLoanView(row, now, 0);
    expect(view).toMatchObject({ daysLate: 4, fineLabel: "R$ 4,00", dueOn: "23/10/2026", initials: "LM" });
    expect(view.renewBlocked).toContain("atraso");
  });
  it("no prazo: sem multa, novo prazo 7 dias depois e renovável", () => {
    const view = toOpenLoanView({ ...row, due_at: "2026-11-03T10:00:00-03:00" }, now, 0);
    expect(view).toMatchObject({ daysLate: 0, fineLabel: "Sem multa", newDueOn: "10/11/2026", renewBlocked: null });
  });
  it("com multa em aberto do usuário a renovação é bloqueada", () => {
    expect(toOpenLoanView({ ...row, due_at: "2026-11-03T10:00:00-03:00" }, now, 100).renewBlocked).toContain("multa");
  });
  it("na 3ª renovação feita, bloqueia a próxima", () => {
    expect(toOpenLoanView({ ...row, due_at: "2026-11-03T10:00:00-03:00", renewals: 3 }, now, 0).renewBlocked).toContain("3 vezes");
  });
  it("tolera perfil ou livro ausente", () => {
    const view = toOpenLoanView({ ...row, profiles: null, books: null }, now, 0);
    expect(view.userName).toBe("Usuário removido");
    expect(view.bookTitle).toBe("Livro removido");
  });
});

describe("renewalsLabel", () => {
  it("formata como no Figma", () => {
    expect(renewalsLabel(1)).toBe("1 de 3");
    expect(renewalsLabel(1, true)).toBe("2 de 3 após confirmar");
  });
});

describe("renewPanelRows", () => {
  const open = { bookTitle: "Dom Casmurro", dueOn: "03/11/2026", newDueOn: "10/11/2026", renewals: 1, renewBlocked: null };

  it("liberado: mostra o novo prazo e a contagem após confirmar", () => {
    expect(renewPanelRows(open)).toEqual([
      ["Livro", "Dom Casmurro"],
      ["Prazo atual", "03/11/2026"],
      ["Novo prazo", "10/11/2026"],
      ["Renovações", "2 de 3 após confirmar"],
    ]);
  });
  it("bloqueado no limite: novo prazo vira traço e a contagem não passa de 3 (nada de '4 de 3')", () => {
    const rows = renewPanelRows({ ...open, renewals: 3, renewBlocked: "Este empréstimo já foi renovado 3 vezes." });
    expect(rows[2]).toEqual(["Novo prazo", "—"]);
    expect(rows[3]).toEqual(["Renovações", "3 de 3"]);
    expect(JSON.stringify(rows)).not.toContain("4 de 3");
  });
});
