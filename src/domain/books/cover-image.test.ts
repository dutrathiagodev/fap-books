import { describe, expect, it } from "vitest";
import { inspectCover } from "./cover-image";

// Imagens mínimas montadas em bytes: só o cabeçalho e os dados de mentira bastam, porque o servidor não decodifica pixels.
const bytes = (...parts: (number[] | Uint8Array)[]) => Uint8Array.from(parts.flatMap((part) => [...part]));
const text = (value: string) => [...value].map((char) => char.charCodeAt(0));
const u16 = (value: number) => [value >> 8, value & 0xff];
const u32 = (value: number) => [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
const u32le = (value: number) => u32(value).reverse();
const contains = (haystack: Uint8Array, needle: string) => Buffer.from(haystack).includes(needle);

function jpeg(width: number, height: number, extra: number[][] = [], eoi = true) {
  const segment = (marker: number, data: number[]) => [0xff, marker, ...u16(data.length + 2), ...data];
  return bytes(
    [0xff, 0xd8],
    ...extra,
    segment(0xc0, [8, ...u16(height), ...u16(width), 1, 1, 0x11, 0]),
    segment(0xda, [1, 1, 0]),
    [1, 2, 3, 4],
    eoi ? [0xff, 0xd9] : [],
  );
}

function png(width: number, height: number, extra: number[][] = [], iend = true) {
  const chunk = (type: string, data: number[]) => [...u32(data.length), ...text(type), ...data, 0, 0, 0, 0];
  return bytes(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    chunk("IHDR", [...u32(width), ...u32(height), 8, 2, 0, 0, 0]),
    ...extra,
    chunk("IDAT", [1, 2, 3]),
    iend ? chunk("IEND", []) : [],
  );
}

const pngChunk = (type: string, data: number[]) => [...u32(data.length), ...text(type), ...data, 0, 0, 0, 0];

const webpChunk = (type: string, data: number[]) => [...text(type), ...u32le(data.length), ...data, ...(data.length % 2 ? [0] : [])];
const riff = (...chunks: number[][]) => {
  const body = chunks.flat();
  return bytes(text("RIFF"), u32le(body.length + 4), text("WEBP"), body);
};

function webp(width: number, height: number, extra: number[][] = [], flags = 0) {
  const canvas = [flags, 0, 0, 0, (width - 1) & 0xff, ((width - 1) >> 8) & 0xff, 0, (height - 1) & 0xff, ((height - 1) >> 8) & 0xff, 0];
  return riff(webpChunk("VP8X", canvas), webpChunk("VP8L", [0x2f, 0, 0, 0, 0]), ...extra);
}

describe("inspectCover: JPEG", () => {
  it("aceita, devolve tipo, extensão e dimensões do cabeçalho", () => {
    const result = inspectCover(jpeg(600, 900));
    expect(result).toMatchObject({ ok: true, cover: { mime: "image/jpeg", extension: "jpg", width: 600, height: 900 } });
  });

  it("remove EXIF, XMP e comentário e mantém a imagem", () => {
    const exif = [0xff, 0xe1, ...u16(2 + 17), ...text("Exif\0\0GPS-secreto")];
    const comment = [0xff, 0xfe, ...u16(2 + 5), ...text("dono!")];
    const result = inspectCover(jpeg(600, 900, [exif, comment]));
    if (!result.ok) throw new Error(result.error);
    expect(contains(result.cover.bytes, "Exif")).toBe(false);
    expect(contains(result.cover.bytes, "dono!")).toBe(false);
    expect(result.cover.bytes.length).toBe(jpeg(600, 900).length);
    expect([...result.cover.bytes.slice(-2)]).toEqual([0xff, 0xd9]);
  });

  it("recusa arquivo truncado, sem EOI e sem tamanho", () => {
    expect(inspectCover(jpeg(600, 900, [], false))).toMatchObject({ ok: false });
    expect(inspectCover(jpeg(600, 900).slice(0, 12))).toMatchObject({ ok: false });
    expect(inspectCover(bytes([0xff, 0xd8, 0xff, 0xda, 0, 2, 0xff, 0xd9]))).toMatchObject({ ok: false });
  });

  it("recusa dimensões fora da regra", () => {
    expect(inspectCover(jpeg(400, 600))).toMatchObject({ ok: false, error: expect.stringMatching(/600×900/) });
    expect(inspectCover(jpeg(900, 900))).toMatchObject({ ok: false, error: expect.stringMatching(/2:3/) });
  });

  it("recusa dimensões declaradas gigantes, mesmo em 2:3 e dentro de 2 MB", () => {
    expect(inspectCover(jpeg(4000, 6000))).toMatchObject({ ok: true });
    expect(inspectCover(jpeg(4002, 6003))).toMatchObject({ ok: false, error: expect.stringMatching(/4000×6000/) });
    expect(inspectCover(png(30000, 45000))).toMatchObject({ ok: false, error: expect.stringMatching(/4000×6000/) });
    expect(inspectCover(webp(16000, 24000))).toMatchObject({ ok: false, error: expect.stringMatching(/4000×6000/) });
  });
});

describe("inspectCover: PNG", () => {
  it("aceita e devolve as dimensões do IHDR", () => {
    expect(inspectCover(png(800, 1200))).toMatchObject({ ok: true, cover: { mime: "image/png", extension: "png", width: 800, height: 1200 } });
  });

  it("remove tEXt, iTXt, zTXt, eXIf e tIME", () => {
    const extra = [
      pngChunk("tEXt", text("Author\0segredo")),
      pngChunk("iTXt", text("XML:com.adobe.xmp\0segredo")),
      pngChunk("zTXt", text("k\0\0segredo")),
      pngChunk("eXIf", text("segredo")),
      pngChunk("tIME", [7, 234, 1, 1, 0, 0, 0]),
    ];
    const result = inspectCover(png(600, 900, extra));
    if (!result.ok) throw new Error(result.error);
    for (const type of ["tEXt", "iTXt", "zTXt", "eXIf", "tIME", "segredo"]) expect(contains(result.cover.bytes, type)).toBe(false);
    expect(result.cover.bytes.length).toBe(png(600, 900).length);
  });

  it("descarta o que vem depois do IEND", () => {
    const result = inspectCover(bytes(png(600, 900), text("lixo escondido")));
    if (!result.ok) throw new Error(result.error);
    expect(contains(result.cover.bytes, "lixo")).toBe(false);
  });

  it("recusa arquivo truncado e dimensões erradas", () => {
    expect(inspectCover(png(600, 900, [], false))).toMatchObject({ ok: false });
    expect(inspectCover(png(600, 900).slice(0, 40))).toMatchObject({ ok: false });
    expect(inspectCover(png(300, 450))).toMatchObject({ ok: false, error: expect.stringMatching(/600×900/) });
    expect(inspectCover(png(1000, 1000))).toMatchObject({ ok: false, error: expect.stringMatching(/2:3/) });
  });
});

describe("inspectCover: WebP", () => {
  it("aceita VP8X (canvas), VP8L e VP8", () => {
    expect(inspectCover(webp(600, 900))).toMatchObject({ ok: true, cover: { mime: "image/webp", extension: "webp", width: 600, height: 900 } });

    const lossless = riff(webpChunk("VP8L", [0x2f, ...u32le(599 | (899 << 14))]));
    expect(inspectCover(lossless)).toMatchObject({ ok: true, cover: { width: 600, height: 900 } });

    const lossy = riff(webpChunk("VP8 ", [0, 0, 0, 0x9d, 0x01, 0x2a, ...[600 & 0xff, 600 >> 8, 900 & 0xff, 900 >> 8]]));
    expect(inspectCover(lossy)).toMatchObject({ ok: true, cover: { width: 600, height: 900 } });
  });

  it("remove EXIF e XMP, limpa as flags e recalcula o tamanho do RIFF", () => {
    const result = inspectCover(webp(600, 900, [webpChunk("EXIF", text("GPS-secreto")), webpChunk("XMP ", text("segredo!"))], 0x0c));
    if (!result.ok) throw new Error(result.error);
    expect(contains(result.cover.bytes, "EXIF")).toBe(false);
    expect(contains(result.cover.bytes, "XMP ")).toBe(false);
    expect(result.cover.bytes[20]).toBe(0);
    expect(result.cover.bytes).toEqual(webp(600, 900));
  });

  it("recusa arquivo truncado e dimensões erradas", () => {
    expect(inspectCover(webp(600, 900).slice(0, 30))).toMatchObject({ ok: false });
    expect(inspectCover(webp(500, 500))).toMatchObject({ ok: false });
    expect(inspectCover(webp(800, 1200).slice(0, 10))).toMatchObject({ ok: false });
  });
});

describe("inspectCover: bytes manipulados", () => {
  it("confia nos bytes e não na extensão: um GIF ou HTML disfarçado de imagem é recusado", () => {
    expect(inspectCover(bytes(text("GIF89a"), new Array(40).fill(0)))).toMatchObject({ ok: false, error: expect.stringMatching(/JPG, PNG ou WebP/) });
    expect(inspectCover(bytes(text("<script>alert(1)</script>")))).toMatchObject({ ok: false });
  });

  it("recusa arquivo vazio e acima de 2 MB", () => {
    expect(inspectCover(new Uint8Array())).toMatchObject({ ok: false, error: expect.stringMatching(/vazia/) });
    expect(inspectCover(new Uint8Array(2 * 1024 * 1024 + 1))).toMatchObject({ ok: false, error: expect.stringMatching(/2 MB/) });
  });

  it("um PNG enviado com cara de JPEG é lido como PNG", () => {
    expect(inspectCover(png(600, 900))).toMatchObject({ ok: true, cover: { mime: "image/png" } });
  });
});
