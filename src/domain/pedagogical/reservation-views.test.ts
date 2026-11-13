import { describe, expect, it } from "vitest";
import { toReservationView, type ReservationRow } from "./reservation-views";

const row: ReservationRow = {
  id: "r1",
  start_date: "2026-11-10",
  days: 30,
  status: "approved",
  requested_in_person: true,
  renewal_of: null,
  purpose: "Redes I",
  decision_note: null,
  decided_at: "2026-11-09T01:00:00Z",
  returned_at: null,
  created_at: "2026-11-08T15:00:00Z",
  teacher: { full_name: "Carlos Eduardo Lima" },
  decider: { full_name: "Maria Santos" },
  pedagogical_reservation_books: [
    { books: { id: "b2", title: "Redes de Computadores", code: "R-1" } },
    { books: { id: "b1", title: "Metodologia Científica", code: "M-1" } },
    { books: null },
  ],
};

describe("toReservationView", () => {
  it("formata datas em dd/mm/aaaa no calendário de Brasília e calcula o dia da devolução", () => {
    const view = toReservationView(row);
    expect(view.startOn).toBe("10/11/2026");
    expect(view.endOn).toBe("10/12/2026");
    expect(view.requestedOn).toBe("08/11/2026");
    expect(view.decidedOn).toBe("08/11/2026");
    expect(view.returnedOn).toBeNull();
  });

  it("ordena os livros por título e ignora livro que o RLS escondeu", () => {
    expect(toReservationView(row).books.map((book) => book.title)).toEqual(["Metodologia Científica", "Redes de Computadores"]);
  });

  it("origem, renovação, iniciais e quem decidiu", () => {
    const view = toReservationView({ ...row, renewal_of: "r0" });
    expect(view).toMatchObject({ inPerson: true, renewal: true, renewalOf: "r0", teacherInitials: "CL", decidedBy: "Maria Santos", purpose: "Redes I" });
    expect(view.endDate).toBe("2026-12-10");
  });

  it("a renovação não tem livros próprios: usa os da reserva original", () => {
    const renewal = { ...row, renewal_of: "r0", pedagogical_reservation_books: [], original: { pedagogical_reservation_books: row.pedagogical_reservation_books } };
    expect(toReservationView(renewal).books.map((book) => book.title)).toEqual(["Metodologia Científica", "Redes de Computadores"]);
  });

  it("professor não lê o perfil de quem decidiu: o nome fica vazio, sem quebrar", () => {
    expect(toReservationView({ ...row, decider: null }).decidedBy).toBeNull();
    expect(toReservationView({ ...row, teacher: null }).teacherName).toBe("Professor");
  });
});
