import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FineView } from "../types/fine";
import { FilterChips } from "./FilterChips";
import { FinePayModal } from "./FinePayModal";
import { FineStatusBadge } from "./FineStatusBadge";
import { FinesTable } from "./FinesTable";
import { Toast } from "./Toast";

const open: FineView = {
  id: "f1",
  userName: "Lucas Andrade Martins",
  initials: "LM",
  registration: "20180849",
  bookTitle: "Código Limpo",
  code: "T-120",
  dueOn: "14/03/2026",
  daysLate: 4,
  amountCents: 800,
  amountLabel: "R$ 8,00",
  paid: false,
  paidAt: null,
  paidBy: null,
};
const paid: FineView = { ...open, id: "f2", userName: "Gabriel Tavares", paid: true, paidAt: "15/03/2026, 10:42", paidBy: "Mariana Silva" };

describe("FineStatusBadge", () => {
  it("Em aberto é vermelho e Paga é verde, os dois com ícone", () => {
    const openHtml = renderToStaticMarkup(createElement(FineStatusBadge, { paid: false }));
    const paidHtml = renderToStaticMarkup(createElement(FineStatusBadge, { paid: true }));
    expect(openHtml).toContain("Em aberto");
    expect(openHtml).toContain("text-danger-700");
    expect(openHtml).toContain("<svg");
    expect(paidHtml).toContain("Paga");
    expect(paidHtml).toContain("text-success-700");
    expect(paidHtml).toContain("<svg");
  });

  it("tem versão para o tema escuro", () => {
    expect(renderToStaticMarkup(createElement(FineStatusBadge, { paid: false }))).toContain("dark:text-red-300");
    expect(renderToStaticMarkup(createElement(FineStatusBadge, { paid: true }))).toContain("dark:text-green-300");
  });
});

describe("FilterChips", () => {
  const chips = [
    { label: "Todas", count: 18, href: "/m?status=all", active: false },
    { label: "Em aberto", count: 12, href: "/m", active: true },
  ];

  it("mostra os números e marca só o chip ativo", () => {
    const html = renderToStaticMarkup(createElement(FilterChips, { label: "Filtrar multas", chips }));
    expect(html).toContain('aria-label="Filtrar multas"');
    expect(html).toContain("(18)");
    expect(html).toContain("(12)");
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toContain('href="/m?status=all"');
  });
});

describe("Toast", () => {
  it("sucesso é um aviso de status e tem botão de fechar", () => {
    const html = renderToStaticMarkup(createElement(Toast, { message: "Baixa registrada.", onClose: () => {} }));
    expect(html).toContain('role="status"');
    expect(html).toContain("Baixa registrada.");
    expect(html).toContain('aria-label="Fechar aviso"');
  });

  it("erro é anunciado como alerta", () => {
    expect(renderToStaticMarkup(createElement(Toast, { message: "Falhou", tone: "error", onClose: () => {} }))).toContain('role="alert"');
  });
});

describe("FinesTable", () => {
  it("mostra usuário, livro, atraso, valor à direita, status e registro", () => {
    const html = renderToStaticMarkup(createElement(FinesTable, { fines: [open, paid], onPay: () => {} }));
    expect(html).toContain("Lucas Andrade Martins");
    expect(html).toContain("Código Limpo");
    expect(html).toContain("4 dias");
    expect(html).toContain("R$ 8,00");
    expect(html).toContain("font-medium whitespace-nowrap text-ink tabular-nums");
    expect(html).toContain("text-right");
    expect(html).toContain("Em aberto");
    expect(html).toContain("Pendente de recebimento");
    expect(html).toContain("Pago em 15/03/2026, 10:42");
    expect(html).toContain("Baixa registrada por Mariana Silva");
  });

  it("só a multa em aberto tem o botão Dar baixa (tabela e cartão)", () => {
    const html = renderToStaticMarkup(createElement(FinesTable, { fines: [open, paid], onPay: () => {} }));
    expect(html.match(/Dar baixa<\/button>/g)).toHaveLength(2);
    expect(html).toContain("Dar baixa na multa de Lucas Andrade Martins, R$ 8,00");
    expect(html).not.toContain("Dar baixa na multa de Gabriel");
  });

  it("sem onPay não há coluna Ações", () => {
    const html = renderToStaticMarkup(createElement(FinesTable, { fines: [open] }));
    expect(html).not.toContain("Ações");
    expect(html).not.toContain("Dar baixa");
  });

  it("desliga os botões enquanto registra", () => {
    expect(renderToStaticMarkup(createElement(FinesTable, { fines: [open], onPay: () => {}, disabled: true }))).toContain("disabled");
  });
});

describe("FinePayModal", () => {
  const props = { onConfirm: () => {}, onClose: () => {} };

  it("fechado quando não há multa escolhida", () => {
    expect(renderToStaticMarkup(createElement(FinePayModal, { ...props, fine: null }))).toBe("");
  });

  it("mostra o resumo e a confirmação, com o registro desligado até marcar", () => {
    const html = renderToStaticMarkup(createElement(FinePayModal, { ...props, fine: open }));
    expect(html).toContain("Dar baixa na multa");
    expect(html).toContain("Lucas Andrade Martins (20180849)");
    expect(html).toContain("Código Limpo");
    expect(html).toContain("4 dias");
    expect(html).toContain("R$ 8,00");
    expect(html).toContain("Recebi R$ 8,00 presencialmente");
    expect(html).toContain("Registrar pagamento");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Registrar pagamento/);
  });

  it("mostra o erro da tentativa e o estado de registro em andamento", () => {
    const html = renderToStaticMarkup(createElement(FinePayModal, { ...props, fine: open, error: "Multa não encontrada." }));
    expect(html).toContain("Multa não encontrada.");
    expect(html).toContain('role="alert"');
    expect(renderToStaticMarkup(createElement(FinePayModal, { ...props, fine: open, pending: true }))).toContain("Registrando…");
  });
});
