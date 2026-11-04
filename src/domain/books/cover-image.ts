import { COVER_MAX_BYTES, coverError } from "./cover-rules";

// Conferência da capa no servidor (card 0119). O tipo vem dos bytes iniciais, nunca de file.type nem da extensão;
// as dimensões vêm do cabeçalho da própria imagem; e os metadados (EXIF, GPS, XMP, comentários) saem antes de guardar.
// Sem biblioteca de imagem: cada formato é lido e reescrito em código puro, para poder ser testado com bytes mínimos.

export type CoverMime = "image/jpeg" | "image/png" | "image/webp";

export interface CleanCover {
  mime: CoverMime;
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
  bytes: Uint8Array;
}

export type CoverInspection = { ok: true; cover: CleanCover } | { ok: false; error: string };

interface Parsed {
  width: number;
  height: number;
  bytes: Uint8Array;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const u32le = (b: Uint8Array, i: number) => ((b[i + 3] << 24) | (b[i + 2] << 16) | (b[i + 1] << 8) | b[i]) >>> 0;
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);

// JPEG: descarta APP0 a APP15 (EXIF, XMP, ICC) e COM. O que vem depois do SOS é a imagem comprimida e segue igual.
function parseJpeg(b: Uint8Array): Parsed | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) return null;
  const parts = [b.subarray(0, 2)];
  let size: { width: number; height: number } | null = null;
  let pos = 2;

  while (pos + 4 <= b.length) {
    if (b[pos] !== 0xff) return null;
    const marker = b[pos + 1];
    if (marker === 0xff) {
      pos++; // byte de preenchimento
      continue;
    }
    // Marcadores sem tamanho (SOI, EOI, RSTn, TEM, 0x00) não aparecem antes dos dados da imagem.
    if (marker === 0 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) return null;

    const length = u16be(b, pos + 2);
    const end = pos + 2 + length;
    if (length < 2 || end > b.length) return null;

    if (marker === 0xda) {
      // Dados da imagem até o fim: precisa ter achado o tamanho e terminar em EOI (senão o arquivo está cortado).
      if (!size || b[b.length - 2] !== 0xff || b[b.length - 1] !== 0xd9) return null;
      return { ...size, bytes: concat([...parts, b.subarray(pos)]) };
    }
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      if (length < 8) return null;
      size = { height: u16be(b, pos + 5), width: u16be(b, pos + 7) };
    }
    const isMetadata = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadata) parts.push(b.subarray(pos, end));
    pos = end;
  }
  return null;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_METADATA = new Set(["tEXt", "iTXt", "zTXt", "eXIf", "tIME"]);

// PNG: descarta os chunks de texto, EXIF e data. Para no IEND; o que vier depois dele não é guardado.
function parsePng(b: Uint8Array): Parsed | null {
  if (b.length < 33 || PNG_SIGNATURE.some((byte, i) => b[i] !== byte)) return null;
  const parts = [b.subarray(0, 8)];
  let size: { width: number; height: number } | null = null;
  let pos = 8;

  while (pos + 12 <= b.length) {
    const length = u32be(b, pos);
    const type = ascii(b, pos + 4, 4);
    const end = pos + 12 + length;
    if (end > b.length) return null;

    if (!size) {
      if (type !== "IHDR" || length !== 13) return null;
      size = { width: u32be(b, pos + 8), height: u32be(b, pos + 12) };
    }
    if (!PNG_METADATA.has(type)) parts.push(b.subarray(pos, end));
    if (type === "IEND") return { ...size, bytes: concat(parts) };
    pos = end;
  }
  return null;
}

const WEBP_METADATA = new Set(["EXIF", "XMP "]);
// Bits do campo de flags do VP8X que avisam da presença de EXIF (0x08) e XMP (0x04).
const WEBP_METADATA_FLAGS = 0x0c;

// Tamanho da imagem a partir do canvas do VP8X ou do primeiro chunk de imagem (WebP simples).
function webpSize(type: string, data: Uint8Array): { width: number; height: number } | null {
  if (type === "VP8X" && data.length >= 10) return { width: u24le(data, 4) + 1, height: u24le(data, 7) + 1 };
  if (type === "VP8 " && data.length >= 10 && data[3] === 0x9d && data[4] === 0x01 && data[5] === 0x2a) {
    return { width: (data[6] | (data[7] << 8)) & 0x3fff, height: (data[8] | (data[9] << 8)) & 0x3fff };
  }
  if (type === "VP8L" && data.length >= 5 && data[0] === 0x2f) {
    const bits = u32le(data, 1);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  return null;
}

// WebP: descarta os chunks EXIF e XMP, limpa os avisos deles no VP8X e recalcula o tamanho do RIFF.
function parseWebp(b: Uint8Array): Parsed | null {
  if (b.length < 20 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") return null;
  const total = u32le(b, 4) + 8;
  if (total > b.length || total % 2 !== 0) return null;

  const chunks: Uint8Array[] = [];
  let size: { width: number; height: number } | null = null;
  let pos = 12;

  while (pos < total) {
    if (pos + 8 > total) return null;
    const type = ascii(b, pos, 4);
    const length = u32le(b, pos + 4);
    const end = pos + 8 + length + (length % 2);
    if (end > total) return null;

    size ??= webpSize(type, b.subarray(pos + 8, pos + 8 + length));
    if (!WEBP_METADATA.has(type)) {
      const chunk = b.slice(pos, end);
      if (type === "VP8X" && length >= 1) chunk[8] &= ~WEBP_METADATA_FLAGS;
      chunks.push(chunk);
    }
    pos = end;
  }
  if (!size || chunks.length === 0) return null;

  const body = concat(chunks);
  const header = new Uint8Array(12);
  header.set(b.subarray(0, 4));
  new DataView(header.buffer).setUint32(4, body.length + 4, true);
  header.set(b.subarray(8, 12), 8);
  return { ...size, bytes: concat([header, body]) };
}

const FORMATS: {
  mime: CoverMime;
  extension: CleanCover["extension"];
  matches: (b: Uint8Array) => boolean;
  parse: (b: Uint8Array) => Parsed | null;
}[] = [
  { mime: "image/jpeg", extension: "jpg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, parse: parseJpeg },
  { mime: "image/png", extension: "png", matches: (b) => PNG_SIGNATURE.every((byte, i) => b[i] === byte), parse: parsePng },
  { mime: "image/webp", extension: "webp", matches: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP", parse: parseWebp },
];

// Confere os bytes de uma capa e devolve a imagem já sem metadados. As mensagens são as mesmas do navegador.
export function inspectCover(input: Uint8Array): CoverInspection {
  if (input.length === 0) return { ok: false, error: "A imagem está vazia." };
  if (input.length > COVER_MAX_BYTES) return { ok: false, error: "A imagem passa de 2 MB." };

  const format = FORMATS.find((candidate) => candidate.matches(input));
  if (!format) return { ok: false, error: "Use uma imagem JPG, PNG ou WebP." };

  const parsed = format.parse(input);
  if (!parsed) return { ok: false, error: "Não foi possível ler esta imagem." };

  const message = coverError({ type: format.mime, size: parsed.bytes.length, width: parsed.width, height: parsed.height });
  if (message) return { ok: false, error: message };

  return { ok: true, cover: { mime: format.mime, extension: format.extension, ...parsed } };
}
