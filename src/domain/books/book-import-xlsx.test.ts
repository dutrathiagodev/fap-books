import { describe, expect, it } from "vitest";
import { cellToText, detectImportFormat, inspectXlsx, sheetToRows, XLSX_MAX_COLUMNS, XLSX_MAX_SCAN_ROWS } from "./book-import-xlsx";
import { BOOK_HEADER, buildFixtureXlsx } from "./xlsx-fixture";
import { XLSX_MIME, buildXlsx, zipStored } from "./xlsx-writer";

describe("detectImportFormat", () => {
  it("aceita .csv e .xlsx pelo nome, em qualquer caixa, com os tipos usuais", () => {
    expect(detectImportFormat("livros.csv", "text/csv")).toEqual({ ok: true, format: "csv" });
    expect(detectImportFormat("LIVROS.CSV", "application/vnd.ms-excel")).toEqual({ ok: true, format: "csv" });
    expect(detectImportFormat("livros.xlsx", XLSX_MIME)).toEqual({ ok: true, format: "xlsx" });
    expect(detectImportFormat("livros.xlsx", "")).toEqual({ ok: true, format: "xlsx" });
  });
  it("recusa planilha com macro e formatos antigos ou de outro tipo", () => {
    expect(detectImportFormat("livros.xlsm", "application/vnd.ms-excel.sheet.macroEnabled.12")).toEqual({ ok: false, reason: "macro" });
    expect(detectImportFormat("livros.xlsb", "")).toEqual({ ok: false, reason: "macro" });
    expect(detectImportFormat("livros.xls", "application/vnd.ms-excel")).toEqual({ ok: false, reason: "unsupported_type" });
    expect(detectImportFormat("livros.pdf", "application/pdf")).toEqual({ ok: false, reason: "unsupported_type" });
    expect(detectImportFormat("semextensao", "text/csv")).toEqual({ ok: false, reason: "unsupported_type" });
  });
  it("recusa tipo que não combina com a extensão", () => {
    expect(detectImportFormat("livros.xlsx", "text/html")).toEqual({ ok: false, reason: "unsupported_type" });
    expect(detectImportFormat("livros.csv", "image/png")).toEqual({ ok: false, reason: "unsupported_type" });
  });
});

describe("inspectXlsx", () => {
  it("aceita uma planilha válida (a do Excel e a nossa)", () => {
    expect(inspectXlsx(buildFixtureXlsx([BOOK_HEADER]))).toEqual({ ok: true });
    expect(inspectXlsx(buildXlsx([BOOK_HEADER]))).toEqual({ ok: true });
  });
  it("recusa um .csv renomeado para .xlsx e arquivo vazio ou curto", () => {
    const csv = new TextEncoder().encode("titulo;autor\nx;y\n");
    expect(inspectXlsx(csv)).toEqual({ ok: false, reason: "invalid_file" });
    expect(inspectXlsx(new Uint8Array())).toEqual({ ok: false, reason: "invalid_file" });
    expect(inspectXlsx(new Uint8Array([0x50, 0x4b]))).toEqual({ ok: false, reason: "invalid_file" });
  });
  it("recusa o formato .xls antigo (começa com D0 CF)", () => {
    expect(inspectXlsx(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]))).toEqual({ ok: false, reason: "invalid_file" });
  });
  it("recusa zip malformado: cortado no meio, sem índice ou com o índice trocado", () => {
    const good = buildFixtureXlsx([BOOK_HEADER]);
    expect(inspectXlsx(good.slice(0, good.length - 30))).toEqual({ ok: false, reason: "invalid_file" });
    expect(inspectXlsx(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]))).toEqual({ ok: false, reason: "invalid_file" });
    const wrongIndex = good.slice();
    new DataView(wrongIndex.buffer).setUint32(wrongIndex.length - 6, 3, true); // endereço do índice fora do lugar
    expect(inspectXlsx(wrongIndex)).toEqual({ ok: false, reason: "invalid_file" });
  });
  it("recusa um zip comum que não é planilha", () => {
    const zip = zipStored([{ name: "leia-me.txt", data: new TextEncoder().encode("oi") }]);
    expect(inspectXlsx(zip)).toEqual({ ok: false, reason: "invalid_file" });
  });
  it("recusa planilha com macro (vbaProject.bin), mesmo com nome .xlsx", () => {
    expect(inspectXlsx(buildFixtureXlsx([BOOK_HEADER], { macro: true }))).toEqual({ ok: false, reason: "macro" });
  });
  it("recusa zip que cresce demais ao descompactar", () => {
    const big = { name: "xl/enorme.bin", data: new Uint8Array(9 * 1024 * 1024) };
    expect(inspectXlsx(buildFixtureXlsx([BOOK_HEADER], { extraFiles: [big] }))).toEqual({ ok: false, reason: "too_big" });
  });
});

describe("cellToText", () => {
  it("texto fica como está e vazio vira texto vazio", () => {
    expect(cellToText("Dom Casmurro")).toBe("Dom Casmurro");
    expect(cellToText(null)).toBe("");
    expect(cellToText(undefined)).toBe("");
    expect(cellToText({})).toBe("");
  });
  it("número vira texto sem notação científica", () => {
    expect(cellToText(2)).toBe("2");
    expect(cellToText(612.01)).toBe("612.01");
    expect(cellToText(9788535287615)).toBe("9788535287615");
    expect(cellToText(Number.NaN)).toBe("");
    expect(cellToText(Number.POSITIVE_INFINITY)).toBe("");
  });
  it("data vira AAAA-MM-DD em UTC e verdadeiro/falso viram texto", () => {
    expect(cellToText(new Date(Date.UTC(2021, 2, 5)))).toBe("2021-03-05");
    expect(cellToText(new Date(Number.NaN))).toBe("");
    expect(cellToText(true)).toBe("VERDADEIRO");
    expect(cellToText(false)).toBe("FALSO");
  });
});

describe("sheetToRows", () => {
  it("corta as colunas além do limite", () => {
    const wide = Array.from({ length: XLSX_MAX_COLUMNS + 10 }, (_, i) => `c${i}`);
    const result = sheetToRows([wide]);
    expect(result.ok && result.rows[0]).toHaveLength(XLSX_MAX_COLUMNS);
  });
  it("recusa planilha com linhas demais", () => {
    expect(sheetToRows(Array.from({ length: XLSX_MAX_SCAN_ROWS + 1 }, () => ["x"]))).toEqual({ ok: false, reason: "too_many_rows" });
    expect(sheetToRows(Array.from({ length: XLSX_MAX_SCAN_ROWS }, () => ["x"])).ok).toBe(true);
  });
});
