// Regras de segurança da importação por .xlsx (FAP-0233). O arquivo vem do usuário, então tudo aqui roda ANTES de a
// biblioteca abrir a planilha e não depende dela: tipo do arquivo, conferência do zip (sem descompactar nada) e a
// conversão das células em texto. Quem abre a planilha de fato é src/services/xlsx-reader.service.ts, só no servidor.
import { IMPORT_MAX_ROWS } from "./book-import";
import { XLSX_MIME } from "./xlsx-writer";

// Lê só até aqui da planilha: o cabeçalho, as linhas aceitas e uma folga para linhas em branco no meio. Passou disso,
// a planilha é recusada como "linhas demais" (o limite de livros em si continua sendo o IMPORT_MAX_ROWS do parser).
export const XLSX_MAX_SCAN_ROWS = IMPORT_MAX_ROWS * 5;
// A planilha modelo tem 8 colunas; o resto à direita (anotações, cálculos) é ignorado.
export const XLSX_MAX_COLUMNS = 20;

// Teto do conteúdo DEPOIS de descompactado. O arquivo enviado tem no máximo 200 KB, mas um zip pode crescer milhares de
// vezes ao abrir ("zip bomb"). Uma planilha de 100 livros descompactada tem poucas dezenas de KB.
const MAX_UNZIPPED_TOTAL = 8 * 1024 * 1024;
const MAX_ENTRIES = 200;

export type ImportFormat = "csv" | "xlsx";

export type ImportFileKind =
  | { ok: true; format: ImportFormat }
  | { ok: false; reason: "macro" | "unsupported_type" };

// Tipos (MIME) aceitos por formato. Alguns sistemas mandam vazio ou "octet-stream", e o Excel do Windows registra o .csv
// como "application/vnd.ms-excel"; por isso a conferência de verdade é a dos primeiros bytes (veja inspectXlsx).
const CSV_MIME = ["text/csv", "text/plain", "application/csv", "application/vnd.ms-excel", "application/octet-stream", ""];
const XLSX_MIME_ACCEPTED = [XLSX_MIME, "application/octet-stream", ""];

// Decide o formato pelo nome e pelo tipo informado. Planilha com macro (.xlsm, .xlsb, .xls) nunca é aberta.
export function detectImportFormat(fileName: string, mime: string): ImportFileKind {
  const extension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  const type = mime.toLowerCase().split(";")[0].trim();
  if (extension === "xlsm" || extension === "xlsb") return { ok: false, reason: "macro" };
  if (extension === "csv" && CSV_MIME.includes(type)) return { ok: true, format: "csv" };
  if (extension === "xlsx" && XLSX_MIME_ACCEPTED.includes(type)) return { ok: true, format: "xlsx" };
  return { ok: false, reason: "unsupported_type" };
}

export type XlsxInspection = { ok: true } | { ok: false; reason: "invalid_file" | "macro" | "too_big" };

// Zip começa com "PK\x03\x04". Um .csv renomeado para .xlsx (ou um .xls antigo, que começa com D0 CF) falha aqui.
function hasZipSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

// Confere o zip lendo só o índice (diretório central) no fim do arquivo, sem descompactar nada: assinatura, estrutura,
// quantidade e tamanho dos itens, criptografia, os dois itens que todo .xlsx tem e a ausência de macro (vbaProject.bin).
export function inspectXlsx(bytes: Uint8Array): XlsxInspection {
  const invalid = { ok: false, reason: "invalid_file" } as const;
  if (!hasZipSignature(bytes)) return invalid;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Registro de fim do zip: 22 bytes + comentário (até 64 KB), procurado de trás para frente.
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) return invalid;

  const count = view.getUint16(end + 10, true);
  const centralSize = view.getUint32(end + 12, true);
  const centralStart = view.getUint32(end + 16, true);
  // 0xffff/0xffffffff indicam zip64 (arquivos enormes): fora do que uma planilha de 200 KB pode ser.
  if (count === 0 || count > MAX_ENTRIES || count === 0xffff || centralStart + centralSize > end) return invalid;

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const names = new Set<string>();
  let unzipped = 0;
  let position = centralStart;
  for (let i = 0; i < count; i++) {
    if (position + 46 > end || view.getUint32(position, true) !== 0x02014b50) return invalid;
    const flags = view.getUint16(position + 8, true);
    const method = view.getUint16(position + 10, true);
    const size = view.getUint32(position + 24, true);
    const nameLength = view.getUint16(position + 28, true);
    const extraLength = view.getUint16(position + 30, true);
    const commentLength = view.getUint16(position + 32, true);
    const next = position + 46 + nameLength + extraLength + commentLength;
    if (next > end) return invalid;
    // Criptografado (bit 0) ou compressão que não seja "sem compressão"/"deflate" não é um .xlsx do Excel.
    if (flags & 1 || (method !== 0 && method !== 8) || size === 0xffffffff) return invalid;

    unzipped += size;
    if (unzipped > MAX_UNZIPPED_TOTAL) return { ok: false, reason: "too_big" };
    names.add(decoder.decode(bytes.subarray(position + 46, position + 46 + nameLength)).toLowerCase());
    position = next;
  }

  if (names.has("xl/vbaproject.bin")) return { ok: false, reason: "macro" };
  if (!names.has("[content_types].xml") || !names.has("xl/workbook.xml")) return invalid;
  return { ok: true };
}

// Texto de uma célula. Fórmulas já chegam como o valor guardado na planilha (a fórmula em si nunca é lida nem executada)
// e links viram o texto exibido. Número vira o número sem notação científica; data vira AAAA-MM-DD (UTC, igual para
// qualquer fuso do servidor); verdadeiro/falso viram texto em português; vazio e tipos desconhecidos viram "".
export function cellToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? numberToText(value) : "";
  if (typeof value === "boolean") return value ? "VERDADEIRO" : "FALSO";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  return "";
}

// 13 vira "13", 612.01 vira "612.01" e 9788535287615 (ISBN digitado como número) não vira "9.78e+12".
function numberToText(value: number): string {
  return Number.isInteger(value) ? BigInt(value).toString() : String(value);
}

export type SheetRows = { ok: true; rows: string[][] } | { ok: false; reason: "too_many_rows" };

// Linhas da biblioteca -> linhas de texto no mesmo formato que parseCsv devolve, para o parser da importação.
export function sheetToRows(data: readonly (readonly unknown[])[]): SheetRows {
  if (data.length > XLSX_MAX_SCAN_ROWS) return { ok: false, reason: "too_many_rows" };
  return { ok: true, rows: data.map((row) => row.slice(0, XLSX_MAX_COLUMNS).map(cellToText)) };
}
