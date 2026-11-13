import { describe, expect, it } from "vitest";
import {
  bookListText,
  filtersText,
  inventoryIndicators,
  overdueIndicators,
  parseExportFormat,
  parseReportFilters,
  pedagogicalIndicators,
  reportExportHref,
  reportHref,
  reportSummary,
} from "./report-rules";

describe("parseReportFilters", () => {
  it("sem endereço: relatório de atraso, só em atraso, página 1", () => {
    expect(parseReportFilters({})).toEqual({ kind: "atraso", from: null, to: null, status: "open", page: 1 });
  });

  it("lê tipo, período, situação e página", () => {
    expect(parseReportFilters({ tipo: "reservas", de: "2026-11-01", ate: "2026-11-13", situacao: "approved", pagina: "3" })).toEqual({
      kind: "reservas",
      from: "2026-11-01",
      to: "2026-11-13",
      status: "approved",
      page: 3,
    });
  });

  it("valor inválido volta ao padrão (nada de erro por endereço adulterado)", () => {
    expect(parseReportFilters({ tipo: "x", situacao: "'; drop table", de: "2026-02-30", ate: "ontem", pagina: "-4" })).toEqual({
      kind: "atraso",
      from: null,
      to: null,
      status: "open",
      page: 1,
    });
  });

  it("a situação vale só para o tipo dela: 'pending' não existe no atraso, 'returned' é de dois tipos", () => {
    expect(parseReportFilters({ tipo: "atraso", situacao: "pending" }).status).toBe("open");
    expect(parseReportFilters({ tipo: "atraso", situacao: "returned" }).status).toBe("returned");
    expect(parseReportFilters({ tipo: "reservas", situacao: "returned" }).status).toBe("returned");
    expect(parseReportFilters({ tipo: "reservas", situacao: "open" }).status).toBe("all");
  });

  it("o acervo ignora período e situação (é um retrato de hoje)", () => {
    expect(parseReportFilters({ tipo: "acervo", de: "2026-11-01", situacao: "all" })).toMatchObject({ kind: "acervo", from: null, to: null });
  });

  it("usa o primeiro valor quando o parâmetro se repete e limita a página", () => {
    expect(parseReportFilters({ tipo: ["reservas", "atraso"], pagina: ["2", "9"] })).toMatchObject({ kind: "reservas", page: 2 });
    expect(parseReportFilters({ pagina: "99999999" }).page).toBe(10_000);
  });
});

describe("reportHref", () => {
  const base = parseReportFilters({});

  it("o padrão não aparece no endereço", () => {
    expect(reportHref(base)).toBe("/funcionario/relatorios");
  });

  it("leva tipo, período, situação e página", () => {
    const filters = parseReportFilters({ tipo: "reservas", de: "2026-11-01", situacao: "rejected", pagina: "2" });
    expect(reportHref(filters)).toBe("/funcionario/relatorios?tipo=reservas&de=2026-11-01&situacao=rejected&pagina=2");
  });

  it("trocar de tipo volta ao padrão do tipo novo (quem monta o link limpa período e situação)", () => {
    expect(reportHref(base, { kind: "acervo", from: null, to: null, status: "all" })).toBe("/funcionario/relatorios?tipo=acervo");
  });

  it("o acervo nunca leva período nem situação", () => {
    expect(reportHref({ ...base, kind: "acervo", from: "2026-11-01", status: "all" })).toBe("/funcionario/relatorios?tipo=acervo");
  });

  it("o link da exportação leva os mesmos filtros, sem página, mais o formato", () => {
    const filters = parseReportFilters({ de: "2026-11-01", pagina: "4" });
    expect(reportExportHref(filters, "csv")).toBe("/funcionario/relatorios/exportar?de=2026-11-01&formato=csv");
    expect(reportExportHref(base, "pdf")).toBe("/funcionario/relatorios/exportar?formato=pdf");
  });
});

describe("parseExportFormat", () => {
  it("só aceita csv e pdf", () => {
    expect(parseExportFormat("csv")).toBe("csv");
    expect(parseExportFormat("pdf")).toBe("pdf");
    expect(parseExportFormat("xlsx")).toBeNull();
    expect(parseExportFormat(null)).toBeNull();
  });
});

describe("textos", () => {
  it("resumo da paginação", () => {
    expect(reportSummary(1, 10, 10, 23, ["registro", "registros"])).toBe("Mostrando 1-10 de 23 registros");
    expect(reportSummary(3, 10, 3, 23, ["registro", "registros"])).toBe("Mostrando 21-23 de 23 registros");
    expect(reportSummary(1, 10, 1, 1, ["registro", "registros"])).toBe("Mostrando 1-1 de 1 registro");
    expect(reportSummary(1, 10, 0, 0, ["registro", "registros"])).toBe("Nenhum registro");
  });

  it("subtítulo da exportação com situação e período", () => {
    expect(filtersText(parseReportFilters({ de: "2026-11-01", ate: "2026-11-13" }))).toBe("Situação: Em atraso · Prazo de 01/11/2026 até 13/11/2026");
    expect(filtersText(parseReportFilters({ tipo: "reservas", situacao: "approved" }))).toBe("Situação: Aprovadas · Todo o período");
    expect(filtersText(parseReportFilters({ tipo: "acervo" }))).toBe("Retrato do acervo na data da exportação");
  });

  it("período com as datas trocadas não filtra (a tela avisa)", () => {
    expect(filtersText(parseReportFilters({ de: "2026-11-13", ate: "2026-11-01" }))).toContain("Todo o período");
  });

  it("lista de livros mostra poucos títulos e o resto em número", () => {
    expect(bookListText([], 0)).toBe("—");
    expect(bookListText(["A", "B"], 2)).toBe("A, B");
    expect(bookListText(["A", "B", "C", "D"], 6)).toBe("A, B, C e mais 3");
  });
});

describe("indicadores", () => {
  it("atraso: total e multa estimada em reais, em vermelho quando há atraso", () => {
    expect(overdueIndicators(3, 1250)).toEqual([
      { label: "Empréstimos em atraso", value: "3", tone: "danger" },
      { label: "Multa estimada", value: "R$ 12,50", tone: "danger" },
    ]);
    expect(overdueIndicators(0, 0).every((item) => item.tone === "default")).toBe(true);
  });

  it("acervo: milhar com ponto", () => {
    const items = inventoryIndicators({ titles: 20000, copies: 61000, borrowed: 12, held: 3, available: 60985, inactiveCopies: 40 });
    expect(items.find((item) => item.label === "Títulos ativos")?.value).toBe("20.000");
    expect(items.find((item) => item.label === "Disponíveis")?.value).toBe("60.985");
  });

  it("reservas: solicitações somam todas as situações", () => {
    const items = pedagogicalIndicators({ pending: 2, approved: 5, rejected: 1, cancelled: 1 });
    expect(items.map((item) => [item.label, item.value])).toEqual([
      ["Solicitações", "9"],
      ["Aprovadas", "5"],
      ["Recusadas", "1"],
      ["Aguardando", "2"],
    ]);
  });
});
