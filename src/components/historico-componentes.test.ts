import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DateRangeFilter } from "./DateRangeFilter";
import { FilterChips } from "./FilterChips";
import { LinkTabs } from "./LinkTabs";
import { LoanHistoryTable } from "./LoanHistoryTable";
import { ToneBadge } from "./ToneBadge";
import type { HistoryRowView } from "@/types/loan-history";

const row: HistoryRowView = {
  id: "1", userName: "Maria da Silva", initials: "MS", registration: "20240123", bookTitle: "Dom Casmurro", code: "T-100",
  borrowedOn: "01/10/2026", dueOn: "08/10/2026", returnedOn: "12/10/2026", renewals: 0, status: "returned_late",
  statusLabel: "Devolvido com atraso", daysLate: 4, fineLabel: "R$ 4,00", fineNote: "Em aberto",
};

describe("ToneBadge", () => {
  it("usa as cores do tom, com a versão do tema escuro", () => {
    const html = renderToStaticMarkup(ToneBadge({ tone: "danger", children: "Em atraso" }));
    expect(html).toContain("bg-danger-100");
    expect(html).toContain("dark:text-red-300");
    expect(html).toContain("Em atraso");
  });
});

describe("FilterChips", () => {
  it("marca o chip ativo com aria-current e mostra a contagem", () => {
    const html = renderToStaticMarkup(
      createElement(FilterChips, {
        label: "Filtrar por situação",
        chips: [
          { label: "Todos", count: 4, href: "/a", active: true },
          { label: "Devolvidos", count: 2, href: "/b", active: false },
        ],
      }),
    );
    expect(html).toContain('aria-label="Filtrar por situação"');
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toContain("(2)");
    expect(html).toContain('href="/b"');
  });
});

describe("FilterChips tone", () => {
  const chips = [{ label: "Todos", count: 4, href: "/a", active: true }];
  it("soft é o padrão e solid pinta o ativo de navy", () => {
    const soft = renderToStaticMarkup(createElement(FilterChips, { label: "x", chips }));
    const solid = renderToStaticMarkup(createElement(FilterChips, { label: "x", chips, tone: "solid" }));
    expect(soft).toContain("bg-selected");
    expect(soft).not.toContain("bg-brand");
    expect(solid).toContain("bg-brand");
    expect(solid).toContain("text-on-brand");
  });
});

describe("LinkTabs", () => {
  it("a aba ativa leva aria-current=page", () => {
    const html = renderToStaticMarkup(
      createElement(LinkTabs, { label: "Consulta", tabs: [{ label: "A", href: "/a", active: true }, { label: "B", href: "/b", active: false }] }),
    );
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });
});

describe("DateRangeFilter", () => {
  it("mantém os campos escondidos e só mostra Limpar com período", () => {
    const props = { action: "/h", hidden: { u: "abc" }, clearHref: "/h?u=abc" };
    const empty = renderToStaticMarkup(createElement(DateRangeFilter, { ...props, from: null, to: null }));
    expect(empty).toContain('type="hidden" name="u" value="abc"');
    expect(empty).not.toContain("Limpar");
    const filled = renderToStaticMarkup(createElement(DateRangeFilter, { ...props, from: "2026-02-01", to: "2026-02-28" }));
    expect(filled).toContain('value="2026-02-01"');
    expect(filled).toContain("Limpar");
  });

  it("mostra o erro do período", () => {
    const html = renderToStaticMarkup(
      createElement(DateRangeFilter, { action: "/h", hidden: {}, from: "2026-03-01", to: "2026-02-01", error: "Datas trocadas", clearHref: "/h" }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Datas trocadas");
  });
});

describe("LoanHistoryTable", () => {
  it("por usuário mostra o livro; por livro mostra a pessoa", () => {
    const byUser = renderToStaticMarkup(createElement(LoanHistoryTable, { rows: [row], focus: "usuario" }));
    expect(byUser).toContain("Dom Casmurro");
    expect(byUser).not.toContain("Matrícula 20240123");
    const byBook = renderToStaticMarkup(createElement(LoanHistoryTable, { rows: [row], focus: "livro" }));
    expect(byBook).toContain("Matrícula 20240123");
  });

  it("mostra datas, status, dias de atraso e multa", () => {
    const html = renderToStaticMarkup(createElement(LoanHistoryTable, { rows: [row], focus: "usuario" }));
    for (const text of ["01/10/2026", "08/10/2026", "12/10/2026", "Devolvido com atraso", "4 dias de atraso", "R$ 4,00", "Em aberto"]) {
      expect(html).toContain(text);
    }
  });

  it("sem linhas mostra o texto de vazio", () => {
    expect(renderToStaticMarkup(createElement(LoanHistoryTable, { rows: [], focus: "usuario" }))).toContain("Sem empréstimos registrados");
  });
});
