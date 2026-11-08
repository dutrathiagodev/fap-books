import { BOOK_AREAS, BOOK_CIRCULATION, bookFormErrors } from "./book-form-rules";
import type { BookFormValues } from "@/types/book";

// Importação de livros por planilha .csv ou .xlsx (Figma, card 0117, aba "Importar planilha"; FAP-0022 e FAP-0233).
// O .xlsx é só outra forma de entregar as mesmas linhas: depois de lido (book-import-xlsx.ts e xlsx-reader.service.ts)
// passa pelo mesmo parser, com os mesmos limites e as mesmas regras do .csv.
// Limites: o arquivo vem do navegador, então o tamanho e o número de linhas são conferidos antes de qualquer gravação.
export const IMPORT_MAX_BYTES = 200 * 1024;
export const IMPORT_MAX_ROWS = 100;

// Colunas da planilha modelo, na ordem. As cinco primeiras são obrigatórias; ISBN, editora e edição podem ficar em branco.
const COLUMNS = ["titulo", "autor", "categoria", "codigo", "quantidade", "isbn", "editora", "edicao"] as const;
const REQUIRED_COLUMNS = ["titulo", "autor", "categoria", "codigo", "quantidade"] as const;
type Column = (typeof COLUMNS)[number];

// Planilha modelo para baixar: cabeçalho e uma linha de exemplo, a mesma nos dois formatos.
export const IMPORT_TEMPLATE_ROWS: string[][] = [
  [...COLUMNS],
  ["Tratado de Fisiologia Médica", "John E. Hall", "Saúde", "612.01 G993t", "1", "978-85-352-8761-5", "Elsevier", "13ª edição (2021)"],
];

// Modelo .csv: ponto e vírgula, que o Excel brasileiro abre direto.
export const IMPORT_TEMPLATE = IMPORT_TEMPLATE_ROWS.map((row) => row.join(";")).join("\n") + "\n";

export interface ImportRow {
  // Linha na planilha (o cabeçalho é a 1), para o aviso de erro apontar o lugar certo.
  line: number;
  values: BookFormValues;
}

export type BookImportParse =
  | { ok: true; rows: ImportRow[] }
  | { ok: false; reason: "empty" | "too_many_rows" }
  | { ok: false; reason: "missing_columns"; missing: string[] };

// Sem acento e em minúsculas: "Título", "titulo" e " TITULO " são a mesma coluna.
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

// Lê o CSV com aspas ("a;b" dentro do campo e "" para uma aspa), CRLF e BOM. O separador é o que mais aparece
// na primeira linha: ";" (Excel brasileiro) ou ",".
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.split(";").length >= firstLine.split(",").length ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Uma área escrita sem acento ou em outra caixa ("saude", "COMPUTAÇÃO") vira a área da lista; o resto segue como veio
// e é recusado pela validação do formulário.
function matchArea(category: string): string {
  return BOOK_AREAS.find((area) => normalize(area) === normalize(category)) ?? category.trim();
}

// Transforma o texto do .csv em linhas de formulário.
export function parseBookImport(text: string): BookImportParse {
  return parseBookRows(parseCsv(text));
}

// Transforma as linhas da planilha (primeira = cabeçalho), venham do .csv ou do .xlsx, em linhas de formulário.
// Linhas totalmente em branco são ignoradas.
export function parseBookRows(sheet: string[][]): BookImportParse {
  const [header, ...body] = sheet;
  if (!header) return { ok: false, reason: "empty" };

  const index = new Map<string, number>();
  header.forEach((name, position) => index.set(normalize(name), position));
  const missing = REQUIRED_COLUMNS.filter((column) => !index.has(column));
  if (missing.length > 0) return { ok: false, reason: "missing_columns", missing };

  const rows: ImportRow[] = [];
  body.forEach((cells, position) => {
    if (cells.every((cell) => cell.trim() === "")) return;
    const read = (column: Column) => (cells[index.get(column) ?? -1] ?? "").trim();
    rows.push({
      line: position + 2,
      values: {
        title: read("titulo"),
        authors: read("autor"),
        category: matchArea(read("categoria")),
        callNumber: read("codigo"),
        isbn: read("isbn"),
        quantity: read("quantidade"),
        circulation: BOOK_CIRCULATION[0],
        publisher: read("editora"),
        edition: read("edicao"),
      },
    });
  });

  if (rows.length === 0) return { ok: false, reason: "empty" };
  if (rows.length > IMPORT_MAX_ROWS) return { ok: false, reason: "too_many_rows" };
  return { ok: true, rows };
}

// Primeira mensagem de erro da linha, ou null se ela pode ser gravada (mesmas regras do formulário manual).
export function importRowError(values: BookFormValues): string | null {
  const [first] = Object.values(bookFormErrors(values));
  return first ?? null;
}
