// Planilhas .xlsx montadas na memória, só para os testes da importação (sem arquivo binário no Git).
// Usa o zip do xlsx-writer e escreve o XML à mão para cobrir o que o modelo não tem: número, data, fórmula e macro.
import { zipStored, type ZipEntry } from "./xlsx-writer";

export type FixtureCell = string | number | boolean | Date | null | { formula: string; value: number | string };

const encoder = new TextEncoder();
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Data -> número de série do Excel (dias desde 30/12/1899).
function serial(date: Date): number {
  return date.getTime() / 86_400_000 + 25569;
}

function letter(index: number): string {
  return String.fromCharCode(65 + index);
}

interface FixtureOptions {
  // Inclui vbaProject.bin, como uma planilha .xlsm de verdade.
  macro?: boolean;
  // Acrescenta uma segunda aba, para provar que só a primeira é lida.
  secondSheet?: FixtureCell[][];
  // Arquivos extras no zip (ex.: um item enorme para testar o limite).
  extraFiles?: ZipEntry[];
}

function sheetXml(rows: FixtureCell[][], strings: string[]): string {
  const body = rows
    .map((cells, r) => {
      const xml = cells
        .map((cell, c) => {
          const ref = `${letter(c)}${r + 1}`;
          if (cell === null) return "";
          if (typeof cell === "string") {
            strings.push(cell);
            return `<c r="${ref}" t="s"><v>${strings.length - 1}</v></c>`;
          }
          if (typeof cell === "number") return `<c r="${ref}"><v>${cell}</v></c>`;
          if (typeof cell === "boolean") return `<c r="${ref}" t="b"><v>${cell ? 1 : 0}</v></c>`;
          if (cell instanceof Date) return `<c r="${ref}" s="1"><v>${serial(cell)}</v></c>`; // estilo 1 = data
          const result = typeof cell.value === "string" ? `t="str"` : "";
          return `<c r="${ref}" ${result}><f>${esc(cell.formula)}</f><v>${esc(String(cell.value))}</v></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${xml}</row>`;
    })
    .join("");
  return `${XML}<worksheet xmlns="${MAIN}"><sheetData>${body}</sheetData></worksheet>`;
}

export function buildFixtureXlsx(rows: FixtureCell[][], options: FixtureOptions = {}): Uint8Array {
  const strings: string[] = [];
  const sheets = [rows, ...(options.secondSheet ? [options.secondSheet] : [])];
  const sheetFiles = sheets.map((sheet, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(sheet, strings)] as const);

  const files: Record<string, string> = {
    "[Content_Types].xml":
      `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      "</Types>",
    "_rels/.rels": `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml":
      `${XML}<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets>` +
      sheets.map((_, i) => `<sheet name="Aba${i + 1}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
      "</sheets></workbook>",
    "xl/_rels/workbook.xml.rels":
      `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
      `<Relationship Id="rId90" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/>` +
      `<Relationship Id="rId91" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    // Estilo 0 = geral; estilo 1 = data (formato interno 14, dd/mm/aaaa).
    "xl/styles.xml":
      `${XML}<styleSheet xmlns="${MAIN}"><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/></cellXfs></styleSheet>`,
    ...Object.fromEntries(sheetFiles),
  };
  files["xl/sharedStrings.xml"] = `${XML}<sst xmlns="${MAIN}" count="${strings.length}" uniqueCount="${strings.length}">${strings
    .map((text) => `<si><t xml:space="preserve">${esc(text)}</t></si>`)
    .join("")}</sst>`;

  const entries: ZipEntry[] = Object.entries(files).map(([name, xml]) => ({ name, data: encoder.encode(xml) }));
  if (options.macro) entries.push({ name: "xl/vbaProject.bin", data: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]) });
  return zipStored([...entries, ...(options.extraFiles ?? [])]);
}

export const BOOK_HEADER = ["titulo", "autor", "categoria", "codigo", "quantidade", "isbn", "editora", "edicao"];
