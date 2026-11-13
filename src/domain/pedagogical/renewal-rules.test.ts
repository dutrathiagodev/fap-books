import { describe, expect, it } from "vitest";
import type { ReservationView } from "../../types/pedagogical-reservation";
import { parseRenewalDays, RENEWAL_WINDOW_DAYS, renewalStateOf, renewedEndDate } from "./renewal-rules";

function view(over: Partial<ReservationView>): ReservationView {
  return {
    id: "r1", teacherName: "Paulo", teacherInitials: "P", books: [], status: "approved", inPerson: false, renewal: false, renewalOf: null,
    startOn: "01/11/2026", endOn: "20/11/2026", endDate: "2026-11-20", days: 19, requestedOn: "30/10/2026", purpose: null,
    decisionNote: null, decidedBy: null, decidedOn: null, returnedOn: null, ...over,
  };
}

describe("renewalStateOf", () => {
  it("a janela é de 7 dias (a mesma do banco)", () => {
    expect(RENEWAL_WINDOW_DAYS).toBe(7);
  });

  it("antes da última semana ainda não pode pedir, e avisa quando abre", () => {
    expect(renewalStateOf(view({}), [], "2026-11-12")).toEqual({ kind: "too_early", opensOn: "13/11/2026" });
  });

  it("no primeiro dia da janela e depois do fim já pode pedir", () => {
    expect(renewalStateOf(view({}), [], "2026-11-13")).toEqual({ kind: "open" });
    expect(renewalStateOf(view({}), [], "2026-11-25")).toEqual({ kind: "open" });
  });

  it("com pedido pendente mostra aguardando, não o botão", () => {
    const original = view({});
    const pending = view({ id: "r2", renewal: true, renewalOf: "r1", status: "pending" });
    expect(renewalStateOf(original, [original, pending], "2026-11-15")).toEqual({ kind: "pending" });
  });

  it("renovação já recusada ou aprovada não impede um novo pedido", () => {
    const original = view({});
    const rejected = view({ id: "r2", renewal: true, renewalOf: "r1", status: "rejected" });
    expect(renewalStateOf(original, [original, rejected], "2026-11-15")).toEqual({ kind: "open" });
  });

  it.each(["pending", "rejected", "returned", "cancelled"] as const)("reserva %s não renova", (status) => {
    expect(renewalStateOf(view({ status }), [], "2026-11-15")).toEqual({ kind: "none" });
  });

  it("a linha de uma renovação não se renova de novo", () => {
    expect(renewalStateOf(view({ renewal: true, renewalOf: "r0" }), [], "2026-11-15")).toEqual({ kind: "none" });
  });
});

describe("parseRenewalDays", () => {
  it("aceita de 1 ao limite do dia", () => {
    expect(parseRenewalDays("7", 30)).toEqual({ ok: true, days: 7 });
    expect(parseRenewalDays(30, 30)).toEqual({ ok: true, days: 30 });
    expect(parseRenewalDays(" 1 ", 10)).toEqual({ ok: true, days: 1 });
  });

  it.each(["", "0", "-3", "2,5", "abc", "12345", null, undefined])("recusa %j", (raw) => {
    expect(parseRenewalDays(raw, 30).ok).toBe(false);
  });

  it("acima do limite configurado recusa com o limite na frase", () => {
    const result = parseRenewalDays("11", 10);
    expect(result).toEqual({ ok: false, message: "O prazo máximo é de 10 dias." });
  });
});

describe("renewedEndDate", () => {
  it("começa no fim atual", () => {
    expect(renewedEndDate("2026-11-20", 7, "2026-11-15")).toBe("2026-11-27");
  });

  it("se o fim já passou, começa hoje", () => {
    expect(renewedEndDate("2026-11-10", 5, "2026-11-15")).toBe("2026-11-20");
  });
});
