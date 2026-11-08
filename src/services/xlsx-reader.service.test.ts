import { describe, expect, it } from "vitest";
import { IMPORT_MAX_ROWS, IMPORT_TEMPLATE_ROWS, importRowError, parseBookRows } from "../domain/books/book-import";
import { BOOK_HEADER, buildFixtureXlsx, type FixtureCell } from "../domain/books/xlsx-fixture";
import { buildXlsx } from "../domain/books/xlsx-writer";
import { readXlsxRows } from "./xlsx-reader.service";

// Lê o .xlsx e passa as linhas ao mesmo parser do .csv, como a ação do servidor faz.
async function importFrom(bytes: Uint8Array) {
  const sheet = await readXlsxRows(bytes);
  return sheet.ok ? parseBookRows(sheet.rows) : sheet;
}

const GOOD_ROW: FixtureCell[] = ["Dom Casmurro", "Machado de Assis", "Literatura brasileira", "869.3 M149d", 2, "978-85-359-0277-5", "Companhia", "1ª edição"];

describe("readXlsxRows", () => {
  it("lê uma planilha válida e entrega ao parser do .csv", async () => {
    const result = await importFrom(buildFixtureXlsx([BOOK_HEADER, GOOD_ROW]));
    expect(result.ok).toBe(true);
    if (!result.ok || !("rows" in result)) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].line).toBe(2);
    expect(result.rows[0].values).toMatchObject({ title: "Dom Casmurro", quantity: "2", isbn: "978-85-359-0277-5", category: "Literatura brasileira" });
    expect(importRowError(result.rows[0].values)).toBeNull();
  });
  it("a planilha modelo do download é lida e passa nas regras", async () => {
    const result = await importFrom(buildXlsx(IMPORT_TEMPLATE_ROWS));
    expect(result.ok).toBe(true);
    if (!result.ok || !("rows" in result)) return;
    expect(importRowError(result.rows[0].values)).toBeNull();
  });
  it("lê só a primeira aba", async () => {
    const result = await importFrom(buildFixtureXlsx([BOOK_HEADER, GOOD_ROW], { secondSheet: [BOOK_HEADER, ["Outro", "Autor", "Saúde", "X1", 1]] }));
    expect(result.ok && "rows" in result && result.rows.map((r) => r.values.title)).toEqual(["Dom Casmurro"]);
  });
  it("cabeçalho errado pede as colunas que faltam", async () => {
    expect(await importFrom(buildFixtureXlsx([["titulo", "autor", "genero"], ["x", "y", "z"]]))).toEqual({
      ok: false,
      reason: "missing_columns",
      missing: ["categoria", "codigo", "quantidade"],
    });
  });
  it("a linha com erro aponta a linha da planilha, e linhas em branco são ignoradas", async () => {
    const result = await importFrom(buildFixtureXlsx([BOOK_HEADER, GOOD_ROW, [], ["Sem autor", null, "Saúde", "C2", 1], ["Qtd ruim", "Autor", "Saúde", "C3", 0]]));
    expect(result.ok && "rows" in result).toBe(true);
    if (!result.ok || !("rows" in result)) return;
    expect(result.rows.map((row) => row.line)).toEqual([2, 4, 5]);
    expect(importRowError(result.rows[1].values)).toBe("Informe o autor.");
    expect(importRowError(result.rows[2].values)).toMatch(/inteiro/);
  });
  it("converte número, data e verdadeiro/falso em texto previsível", async () => {
    const result = await importFrom(
      buildFixtureXlsx([BOOK_HEADER, ["Livro", "Autor", "Saúde", 612.01, 3, 9788535287615, "Editora", new Date(Date.UTC(2021, 0, 15))]]),
    );
    if (!result.ok || !("rows" in result)) throw new Error("planilha deveria ser lida");
    expect(result.rows[0].values).toMatchObject({ callNumber: "612.01", quantity: "3", isbn: "9788535287615", edition: "2021-01-15" });
  });
  it("ignora a fórmula e usa só o valor guardado na célula", async () => {
    const result = await importFrom(buildFixtureXlsx([BOOK_HEADER, ["Livro", "Autor", "Saúde", "C9", { formula: "1+1", value: 2 }]]));
    if (!result.ok || !("rows" in result)) throw new Error("planilha deveria ser lida");
    expect(result.rows[0].values.quantity).toBe("2");
  });
  it("recusa planilha com mais livros que o limite", async () => {
    const rows = Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) => ["Livro", "Autor", "Saúde", `C${i}`, 1]);
    expect(await importFrom(buildFixtureXlsx([BOOK_HEADER, ...rows]))).toEqual({ ok: false, reason: "too_many_rows" });
  });
  it("recusa planilha com milhares de linhas antes de converter", async () => {
    const rows = Array.from({ length: 2000 }, (_, i) => ["Livro", "Autor", "Saúde", `C${i}`, 1]);
    expect(await importFrom(buildFixtureXlsx([BOOK_HEADER, ...rows]))).toEqual({ ok: false, reason: "too_many_rows" });
  });
  it("arquivo sem livros (só o cabeçalho) é planilha vazia", async () => {
    expect(await importFrom(buildFixtureXlsx([BOOK_HEADER]))).toEqual({ ok: false, reason: "empty" });
  });
  it("um .csv renomeado para .xlsx vira arquivo inválido, sem erro bruto da biblioteca", async () => {
    const csv = new TextEncoder().encode("titulo;autor;categoria;codigo;quantidade\nx;y;Saúde;C1;1\n");
    expect(await readXlsxRows(csv)).toEqual({ ok: false, reason: "invalid_file" });
  });
  it("zip malformado vira arquivo inválido", async () => {
    const good = buildFixtureXlsx([BOOK_HEADER, GOOD_ROW]);
    expect(await readXlsxRows(good.slice(0, 200))).toEqual({ ok: false, reason: "invalid_file" });
    // Zip cujo índice está certo mas o conteúdo da planilha não é XML.
    const broken = good.slice();
    const text = new TextDecoder().decode(broken);
    const at = text.indexOf("<sheetData>");
    broken.set(new TextEncoder().encode("<<<<<<<<<<<"), at);
    expect(await readXlsxRows(broken)).toEqual({ ok: false, reason: "invalid_file" });
  });
  it("planilha com macro (.xlsm) é recusada", async () => {
    expect(await readXlsxRows(buildFixtureXlsx([BOOK_HEADER, GOOD_ROW], { macro: true }))).toEqual({ ok: false, reason: "macro" });
  });
  it("zip que explode ao descompactar é recusado sem abrir", async () => {
    const big = { name: "xl/enorme.bin", data: new Uint8Array(9 * 1024 * 1024) };
    expect(await readXlsxRows(buildFixtureXlsx([BOOK_HEADER, GOOD_ROW], { extraFiles: [big] }))).toEqual({ ok: false, reason: "too_big" });
  });
});
