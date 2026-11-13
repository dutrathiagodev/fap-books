import { describe, expect, it } from "vitest";
import { columnWidths, csvCell, fitText, inventoryTable, overdueTable, pdfPageCount, pedagogicalTable, toCsv, toPdf } from "./report-export";
import type { ExportTable, OverdueRowView } from "@/types/report";

const row: OverdueRowView = {
  id: "1",
  userName: "Maria da Conceição",
  registration: "20260001",
  bookTitle: "Dom Casmurro",
  code: "R-001",
  dueOn: "01/11/2026",
  returnedOn: null,
  daysLate: 12,
  fineCents: 1200,
};

const sample: ExportTable = { title: "Teste", subtitle: "Filtro", headers: ["A", "B"], rows: [["x", "y"]], omitted: 0 };

describe("csvCell", () => {
  it("texto comum passa como está", () => {
    expect(csvCell("Dom Casmurro")).toBe("Dom Casmurro");
  });

  it.each(["=1+1", "+55 41", "-2", "@SOMA(A1)", "\tcmd", "\rcmd"])("célula que começa com fórmula (%j) ganha apóstrofo", (value) => {
    expect(csvCell(value).replace(/^"/, "")).toMatch(/^'/);
  });

  it("o sinal no meio do texto não é fórmula", () => {
    expect(csvCell("Ana-Maria = filha")).toBe("Ana-Maria = filha");
  });

  it("aspas, ponto e vírgula e quebra de linha fecham a célula entre aspas", () => {
    expect(csvCell('Livro "A"')).toBe('"Livro ""A"""');
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });

  it("fórmula com aspas protege e escapa", () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
  });
});

describe("toCsv", () => {
  it("começa com o BOM do UTF-8 (o Excel reconhece os acentos), usa ; e termina linhas com CRLF", () => {
    const csv = toCsv(sample);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿A;B\r\nx;y\r\n");
  });

  it("o relatório de atraso exporta os mesmos números da tela, com a multa em reais", () => {
    const csv = toCsv(overdueTable([row], "f", 0));
    expect(csv).toContain("Usuário;Matrícula;Livro;Tombo;Prazo;Devolução;Dias de atraso;Multa estimada");
    expect(csv).toContain("Maria da Conceição;20260001;Dom Casmurro;R-001;01/11/2026;;12;R$ 1.200,00".replace("1.200,00", "12,00"));
  });

  it("nome digitado com fórmula não vira fórmula na planilha", () => {
    const csv = toCsv(overdueTable([{ ...row, userName: "=cmd|' /C calc'!A0" }], "f", 0));
    expect(csv).toContain("'=cmd|' /C calc'!A0");
    expect(csv).not.toContain("\r\n=cmd");
  });

  it("acervo e reservas têm cabeçalhos próprios", () => {
    expect(toCsv(inventoryTable([], "f", 0))).toContain("Categoria;Títulos ativos;Exemplares;Disponíveis");
    const reserva = pedagogicalTable(
      [{ id: "1", teacherName: "Prof", status: "approved", requestedOn: "01/11/2026", startOn: "10/11/2026", days: 5, purpose: null, bookCount: 12, bookTitles: ["A", "B"] }],
      "f",
      0,
    );
    expect(toCsv(reserva)).toContain("Prof;Aprovada;01/11/2026;10/11/2026;5;;A; B; e mais 10".replace("A; B; e mais 10", '"A; B; e mais 10"'));
  });
});

describe("PDF", () => {
  const text = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");

  it("gera um PDF válido: cabeçalho, objetos, xref e fim", () => {
    const pdf = text(toPdf(sample, "13/11/2026"));
    expect(pdf.startsWith("%PDF-1.4\n")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdf).toContain("/Type /Catalog");
    expect(pdf).toContain("/MediaBox [0 0 842 595]");
    expect(pdf).toContain("(Teste) Tj");
    expect(pdf).toContain("Página 1 de 1");
  });

  it("os deslocamentos do xref apontam para cada objeto", () => {
    const pdf = text(toPdf({ ...sample, rows: Array.from({ length: 80 }, (_, i) => [`linha ${i}`, "y"]) }, "13/11/2026"));
    const start = Number(/startxref\n(\d+)/.exec(pdf)![1]);
    expect(pdf.slice(start, start + 4)).toBe("xref");
    const offsets = [...pdf.slice(start).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    offsets.forEach((offset, i) => expect(pdf.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
  });

  it("acentos do português saem em um byte só (WinAnsi), sem estragar o tamanho dos conteúdos", () => {
    const bytes = toPdf({ ...sample, rows: [["Conceição"]], headers: ["Nome"] }, "13/11/2026");
    expect(text(bytes)).toContain("(Concei\xE7\xE3o) Tj");
    const pdf = text(bytes);
    const length = Number(/\/Length (\d+)/.exec(pdf)![1]);
    const body = /stream\n([\s\S]*?)\nendstream/.exec(pdf)![1];
    expect(body.length).toBe(length);
  });

  it("parênteses e barras do texto são escapados (não quebram o conteúdo)", () => {
    expect(text(toPdf({ ...sample, rows: [["a (b) \\ c"]] }, "13/11/2026"))).toContain("(a \\(b\\) \\\\ c) Tj");
  });

  it("caractere fora do Latin-1 vira ?", () => {
    expect(text(toPdf({ ...sample, rows: [["日本"]] }, "13/11/2026"))).toContain("(??) Tj");
  });

  it("muitas linhas viram várias páginas, cada uma com a numeração", () => {
    const rows = Array.from({ length: 100 }, (_, i) => [`l${i}`, "y"]);
    const pages = pdfPageCount(rows.length);
    expect(pages).toBeGreaterThan(2);
    const pdf = text(toPdf({ ...sample, rows }, "13/11/2026"));
    expect(pdf).toContain(`/Count ${pages}`);
    expect(pdf).toContain(`Página ${pages} de ${pages}`);
    expect(pdf).toContain("(l99) Tj");
  });

  it("sem linhas, avisa; com linhas omitidas, informa o corte", () => {
    expect(text(toPdf({ ...sample, rows: [] }, "13/11/2026"))).toContain("Nenhum registro");
    expect(text(toPdf({ ...sample, omitted: 25 }, "13/11/2026"))).toContain("mais 25 não couberam");
  });
});

describe("ajuste de colunas", () => {
  it("corta o texto que não cabe com reticências", () => {
    expect(fitText("abcdefghij", 100)).toBe("abcdefghij");
    expect(fitText("a".repeat(100), 40)).toMatch(/^a+\.\.\.$/);
    expect(fitText("a   b\n c", 100)).toBe("a b c");
  });

  it("as colunas somam a largura útil e nenhuma some", () => {
    const widths = columnWidths({ ...sample, headers: ["Curta", "Uma coluna bem mais longa que a outra"] }, 770);
    expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(770);
    expect(Math.min(...widths)).toBeGreaterThan(50);
  });
});
