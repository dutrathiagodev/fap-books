// Gerador mínimo de .xlsx, só para a planilha modelo da importação (FAP-0233). Sem biblioteca: um .xlsx é um zip com
// alguns XML, e o modelo só tem texto. Os arquivos entram sem compressão ("stored"), o que mantém o código curto e o
// arquivo pequeno o bastante (poucos KB). A leitura de planilhas enviadas é outra coisa e fica só no servidor.

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const encoder = new TextEncoder();

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

// CRC-32 do zip (polinômio padrão), com a tabela montada uma vez.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Data do zip no formato do DOS: 01/01/1980, a menor possível (o zip exige uma data, o conteúdo não depende dela).
const DOS_DATE = (1 << 5) | 1;

// Monta um zip com os arquivos sem compressão. Nomes em UTF-8 (bit 11 do campo de flags).
export function zipStored(entries: ZipEntry[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBytes = encoder.encode(name);
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // versão mínima para extrair
    local.setUint16(6, 0x0800, true); // nome em UTF-8
    local.setUint16(12, DOS_DATE, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true); // tamanho compactado = original (sem compressão)
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(14, DOS_DATE, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, data.length, true);
    central.setUint32(24, data.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint32(42, offset, true); // onde o arquivo começa

    locals.push(new Uint8Array(local.buffer), nameBytes, data);
    centrals.push(new Uint8Array(central.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const parts = [...locals, ...centrals, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let position = 0;
  for (const part of parts) {
    out.set(part, position);
    position += part.length;
  }
  return out;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Letra da coluna: 0 -> A, 25 -> Z, 26 -> AA.
function columnLetter(index: number): string {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  return letters;
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_PACKAGE_REL = "http://schemas.openxmlformats.org/package/2006/relationships";

// Planilha de uma aba só com texto. Cada célula é texto embutido (inlineStr), sem tabela de textos compartilhados.
export function buildXlsx(rows: string[][], sheetName = "Livros"): Uint8Array {
  const sheetRows = rows
    .map(
      (cells, r) =>
        `<row r="${r + 1}">` +
        cells
          .map((text, c) => `<c r="${columnLetter(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`)
          .join("") +
        "</row>",
    )
    .join("");
  const columns = (rows[0] ?? []).map((_, c) => `<col min="${c + 1}" max="${c + 1}" width="24" customWidth="1"/>`).join("");

  const files: Record<string, string> = {
    "[Content_Types].xml":
      `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      "</Types>",
    "_rels/.rels":
      `${XML_HEADER}<Relationships xmlns="${NS_PACKAGE_REL}">` +
      `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml":
      `${XML_HEADER}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
      `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels":
      `${XML_HEADER}<Relationships xmlns="${NS_PACKAGE_REL}">` +
      `<Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `${XML_HEADER}<worksheet xmlns="${NS_MAIN}"><cols>${columns}</cols><sheetData>${sheetRows}</sheetData></worksheet>`,
  };

  return zipStored(Object.entries(files).map(([name, xml]) => ({ name, data: encoder.encode(xml) })));
}
