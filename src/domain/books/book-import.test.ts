import { describe, expect, it } from "vitest";
import { IMPORT_MAX_ROWS, IMPORT_TEMPLATE, importRowError, parseBookImport, parseCsv } from "./book-import";

const HEADER = "titulo;autor;categoria;codigo;quantidade;isbn;editora;edicao";

describe("parseCsv", () => {
  it("lê ponto e vírgula, vírgula, aspas e fim de linha do Windows", () => {
    expect(parseCsv("a;b\r\n1;2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv('a;b\n"x;y";"diz ""oi"""')).toEqual([
      ["a", "b"],
      ["x;y", 'diz "oi"'],
    ]);
  });
  it("ignora o BOM que o Excel coloca no começo", () => {
    expect(parseCsv("﻿a;b\n1;2")[0]).toEqual(["a", "b"]);
  });
});

describe("parseBookImport", () => {
  it("a planilha modelo é lida e passa nas regras do formulário", () => {
    const result = parseBookImport(IMPORT_TEMPLATE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].line).toBe(2);
    expect(importRowError(result.rows[0].values)).toBeNull();
  });
  it("aceita cabeçalho com acento e caixa diferentes, e área sem acento", () => {
    const result = parseBookImport("Título;AUTOR;Categoria;Código;Quantidade\nDom Casmurro;Machado de Assis;literatura brasileira;869.3 M149d;2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0].values.category).toBe("Literatura brasileira");
    expect(importRowError(result.rows[0].values)).toBeNull();
  });
  it("pede as colunas que faltam", () => {
    expect(parseBookImport("titulo;autor\nx;y")).toEqual({ ok: false, reason: "missing_columns", missing: ["categoria", "codigo", "quantidade"] });
  });
  it("recusa arquivo vazio, só com cabeçalho ou só com linhas em branco", () => {
    expect(parseBookImport("")).toEqual({ ok: false, reason: "empty" });
    expect(parseBookImport(HEADER)).toEqual({ ok: false, reason: "empty" });
    expect(parseBookImport(`${HEADER}\n;;;;;;;\n`)).toEqual({ ok: false, reason: "empty" });
  });
  it("recusa planilha com mais linhas que o limite", () => {
    const lines = Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) => `Livro ${i};Autor;Saúde;C${i};1;;;`);
    expect(parseBookImport([HEADER, ...lines].join("\n"))).toEqual({ ok: false, reason: "too_many_rows" });
  });
  it("a linha ruim aponta a linha da planilha e o problema", () => {
    const result = parseBookImport(`${HEADER}\nBom;Autor;Saúde;C1;1;;;\nSem autor;;Saúde;C2;1;;;\nQtd ruim;Autor;Saúde;C3;0;;;`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows.map((row) => row.line)).toEqual([2, 3, 4]);
    expect(importRowError(result.rows[0].values)).toBeNull();
    expect(importRowError(result.rows[1].values)).toBe("Informe o autor.");
    expect(importRowError(result.rows[2].values)).toMatch(/inteiro/);
  });
});
