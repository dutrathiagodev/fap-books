import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildStudentSummary, toMyFineView, toMyLoanView, toMyReservationView } from "../domain/student/student-rules";
import { FinePaymentNotice } from "./FinePaymentNotice";
import { StudentDeadlineNotice } from "./StudentDeadlineNotice";
import { StudentFineList } from "./StudentFineList";
import { StudentLoanList } from "./StudentLoanList";
import { StudentReservationList } from "./StudentReservationList";
import { StudentSummaryCards } from "./StudentSummaryCards";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

const NOW = new Date("2026-11-10T15:00:00Z");
const loanRow = (due: string, renewals = 0) => ({ id: "l1", borrowed_at: "2026-11-03T15:00:00Z", due_at: due, renewals, books: { title: "Dom Casmurro", code: "R-1" } });
const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("resumo e avisos de prazo", () => {
  const loans = [toMyLoanView(loanRow("2026-11-06T15:00:00Z"), NOW, 0), toMyLoanView(loanRow("2026-11-17T15:00:00Z"), NOW, 0)];
  const summary = buildStudentSummary({ loans, graduating: false, openFineCents: 400 });

  it("mostra livros de 3, prazos e multa em aberto", () => {
    const html = render(createElement(StudentSummaryCards, { summary }));
    expect(html).toContain("2 de 3");
    expect(html).toContain("R$ 4,00");
    expect(html).toContain("text-danger");
  });

  it("aviso lista o livro atrasado com selo escrito e leva aos empréstimos", () => {
    const html = render(createElement(StudentDeadlineNotice, { summary, loans }));
    expect(html).toContain("1 está atrasado");
    expect(html).toContain("Atrasado");
    expect(html).toContain('href="/aluno/emprestimos"');
    expect(html).toContain("dark:");
  });

  it("sem prazo próximo, mostra a boa notícia", () => {
    const calm = buildStudentSummary({ loans: [], graduating: false, openFineCents: 0 });
    expect(render(createElement(StudentDeadlineNotice, { summary: calm, loans: [] }))).toContain("Nenhum prazo próximo ou atrasado.");
  });
});

describe("lista de empréstimos", () => {
  const renew = vi.fn();
  it("pode renovar: botão ligado, com alvo de 44 px e o novo prazo", () => {
    const html = render(createElement(StudentLoanList, { loans: [toMyLoanView(loanRow("2026-11-17T15:00:00Z"), NOW, 0)], renew }));
    expect(html).toContain("Renovar");
    expect(html).toContain("h-11");
    expect(html).not.toContain(" disabled=");
    expect(html).toContain("Novo prazo: 24/11/2026");
  });

  it("atrasado ou com multa: botão desligado e o motivo escrito", () => {
    const late = render(createElement(StudentLoanList, { loans: [toMyLoanView(loanRow("2026-11-06T15:00:00Z"), NOW, 0)], renew }));
    expect(late).toContain(" disabled=");
    expect(late).toContain("Devolva o livro na biblioteca");
    const fined = render(createElement(StudentLoanList, { loans: [toMyLoanView(loanRow("2026-11-17T15:00:00Z"), NOW, 200)], renew }));
    expect(fined).toContain("Você tem multa em aberto");
  });
});

describe("reservas e multas", () => {
  it("sem reservas: estado vazio claro", () => {
    expect(render(createElement(StudentReservationList, { reservations: [] }))).toContain("Você não tem reservas");
  });

  it("reserva na fila mostra a situação em texto", () => {
    const reservation = toMyReservationView({ id: "r1", status: "waiting", created_at: "2026-11-09T15:00:00Z", books: { title: "Clean Code", code: "T-1" } });
    const html = render(createElement(StudentReservationList, { reservations: [reservation] }));
    expect(html).toContain("Clean Code");
    expect(html).toContain("Na fila");
  });

  it("multa em aberto traz o aviso de pagamento presencial com o contato da biblioteca", () => {
    const fine = toMyFineView({ id: "f1", days_late: 4, amount_cents: 400, paid_at: null, loans: { due_at: "2026-11-06T15:00:00Z", books: { title: "Clean Code", code: "T-1" } } });
    const html = render(createElement(StudentFineList, { fines: [fine] }));
    expect(html).toContain("R$ 4,00");
    expect(html).toContain("Em aberto");
    expect(html).toContain("somente na biblioteca");
    expect(html).toContain("(44) 3236-8065");
  });

  it("sem multas: estado vazio e sem aviso de pagamento", () => {
    const html = render(createElement(StudentFineList, { fines: [] }));
    expect(html).toContain("Você não tem multas");
    expect(html).not.toContain("somente na biblioteca");
  });

  it("o aviso diz R$ 1,00 por dia corrido", () => {
    expect(render(createElement(FinePaymentNotice))).toContain("R$ 1,00 por dia corrido");
  });
});
