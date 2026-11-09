import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PickableBook, ReservationView } from "../types/pedagogical-reservation";
import { BookMultiPicker } from "./BookMultiPicker";
import { RejectReservationModal } from "./RejectReservationModal";
import { ReservationCard } from "./ReservationCard";
import { ReservationForm } from "./ReservationForm";
import { ReservationKindBadge, ReservationOriginBadge, ReservationStatusBadge } from "./ReservationBadges";
import { TeacherPicker } from "./TeacherPicker";

const view: ReservationView = {
  id: "r1",
  teacherName: "Carlos Eduardo Lima",
  teacherInitials: "CL",
  books: [
    { id: "b1", title: "Metodologia Científica", code: "M-1" },
    { id: "b2", title: "Redes de Computadores", code: "R-1" },
  ],
  status: "pending",
  inPerson: false,
  renewal: false,
  startOn: "10/11/2026",
  endOn: "10/12/2026",
  days: 30,
  requestedOn: "08/11/2026",
  purpose: "Redes I",
  decisionNote: null,
  decidedBy: null,
  decidedOn: null,
  returnedOn: null,
};
const book: PickableBook = { id: "b1", title: "Metodologia Científica", author: "Lakatos", code: "M-1", situation: "available" };
const search = vi.fn();

describe("ReservationStatusBadge", () => {
  it("cada situação tem o texto do Figma e o tom certo (texto sempre presente)", () => {
    const html = (status: ReservationView["status"]) => renderToStaticMarkup(createElement(ReservationStatusBadge, { status }));
    expect(html("pending")).toContain("Aguardando aprovação");
    expect(html("pending")).toContain("bg-warning-100");
    expect(html("approved")).toContain("Aprovada");
    expect(html("approved")).toContain("bg-success-100");
    expect(html("rejected")).toContain("Recusada");
    expect(html("rejected")).toContain("bg-danger-100");
    expect(html("returned")).toContain("Devolvida");
  });

  it("origem e tipo", () => {
    expect(renderToStaticMarkup(createElement(ReservationOriginBadge, { inPerson: true }))).toContain("Presencial");
    expect(renderToStaticMarkup(createElement(ReservationOriginBadge, { inPerson: false }))).toContain("Online");
    expect(renderToStaticMarkup(createElement(ReservationKindBadge, { renewal: true }))).toContain("Renovação");
    expect(renderToStaticMarkup(createElement(ReservationKindBadge, { renewal: false }))).toContain("Nova");
  });
});

describe("ReservationCard", () => {
  it("mostra livros, período em dd/mm/aaaa, prazo, disciplina e situação", () => {
    const html = renderToStaticMarkup(createElement(ReservationCard, { reservation: view }));
    expect(html).toContain("Metodologia Científica, Redes de Computadores");
    expect(html).toContain("10/11/2026 a 10/12/2026");
    expect(html).toContain("30 dias");
    expect(html).toContain("Disciplina: Redes I");
    expect(html).toContain("Aguardando aprovação");
  });

  it("recusada mostra a justificativa; devolvida mostra a data", () => {
    const rejected = renderToStaticMarkup(createElement(ReservationCard, { reservation: { ...view, status: "rejected", decisionNote: "Sem exemplares." } }));
    expect(rejected).toContain("Justificativa:");
    expect(rejected).toContain("Sem exemplares.");
    const returned = renderToStaticMarkup(createElement(ReservationCard, { reservation: { ...view, status: "returned", returnedOn: "09/12/2026" } }));
    expect(returned).toContain("Devolvida em 09/12/2026");
  });
});

describe("BookMultiPicker", () => {
  it("mostra os escolhidos com botão de remover e a contagem", () => {
    const html = renderToStaticMarkup(createElement(BookMultiPicker, { selected: [book], onChange: vi.fn(), search, max: 10 }));
    expect(html).toContain("Remover Metodologia Científica");
    expect(html).toContain("1 de 10 livros escolhidos.");
  });

  it("no limite, o campo de busca fica desligado e avisa", () => {
    const html = renderToStaticMarkup(createElement(BookMultiPicker, { selected: [book], onChange: vi.fn(), search, max: 1 }));
    expect(html).toContain("Limite de 1 livros atingido");
    expect(html).toContain("disabled");
  });

  it("mostra o erro ligado ao campo", () => {
    const html = renderToStaticMarkup(createElement(BookMultiPicker, { selected: [], onChange: vi.fn(), search, max: 10, error: "Escolha pelo menos um livro." }));
    expect(html).toContain("Escolha pelo menos um livro.");
    expect(html).toContain('aria-invalid="true"');
  });
});

describe("TeacherPicker", () => {
  it("escolhido mostra nome, matrícula e o botão Trocar", () => {
    const teacher = { id: "t1", name: "Carlos Eduardo Lima", initials: "CL", registration: "123456", detail: "Redes" };
    const html = renderToStaticMarkup(createElement(TeacherPicker, { selected: teacher, onChange: vi.fn(), search: vi.fn() }));
    expect(html).toContain("Carlos Eduardo Lima");
    expect(html).toContain("Matrícula 123456");
    expect(html).toContain("Trocar");
  });
});

describe("ReservationForm", () => {
  const base = { today: "2026-11-08", searchBooks: search, submit: vi.fn() };

  it("professor: campos do Figma, limite de 30 dias e botão Enviar solicitação", () => {
    const html = renderToStaticMarkup(createElement(ReservationForm, { ...base, variant: "teacher" }));
    expect(html).toContain("Data de início do uso");
    expect(html).toContain("Prazo de posse (dias)");
    expect(html).toContain("Máximo de 30 dias");
    expect(html).toContain("Disciplina (opcional)");
    expect(html).toContain('min="2026-11-08"');
    expect(html).toContain('max="30"');
    expect(html).toContain("Enviar solicitação");
    expect(html).toContain("A reserva precisa ser aprovada pela bibliotecária.");
    expect(html).not.toContain("Buscar professor");
  });

  it("balcão: começa pela busca do professor e o botão é Registrar solicitação", () => {
    const html = renderToStaticMarkup(createElement(ReservationForm, { ...base, variant: "in_person", searchTeachers: vi.fn() }));
    expect(html).toContain("Buscar professor por nome ou matrícula");
    expect(html).toContain("Registrar solicitação");
  });
});

describe("RejectReservationModal", () => {
  it("fechado não renderiza nada", () => {
    expect(renderToStaticMarkup(createElement(RejectReservationModal, { reservation: null, onConfirm: vi.fn(), onClose: vi.fn() }))).toBe("");
  });

  it("aberto pede a justificativa obrigatória e tem o botão Recusar", () => {
    const html = renderToStaticMarkup(createElement(RejectReservationModal, { reservation: view, onConfirm: vi.fn(), onClose: vi.fn() }));
    expect(html).toContain("Recusar solicitação");
    expect(html).toContain("Justificativa (obrigatória)");
    expect(html).toContain("Carlos Eduardo Lima");
    expect(html).toContain("0/500");
  });

  it("mostra o erro do servidor dentro do modal", () => {
    const html = renderToStaticMarkup(createElement(RejectReservationModal, { reservation: view, error: "Esta solicitação já foi decidida. Atualize a tela.", onConfirm: vi.fn(), onClose: vi.fn() }));
    expect(html).toContain("já foi decidida");
  });
});
