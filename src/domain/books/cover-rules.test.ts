import { describe, expect, it } from "vitest";
import { coverError, isCoverRatio } from "./cover-rules";

const ok = { type: "image/jpeg", size: 180_000, width: 600, height: 900 };

describe("coverError", () => {
  it("aceita JPG, PNG e WebP no tamanho e na proporção do frame", () => {
    expect(coverError(ok)).toBeNull();
    expect(coverError({ ...ok, type: "image/png", width: 800, height: 1200 })).toBeNull();
    expect(coverError({ ...ok, type: "image/webp", width: 1000, height: 1500 })).toBeNull();
  });

  it("recusa outro formato, arquivo vazio e imagem acima de 2 MB", () => {
    expect(coverError({ ...ok, type: "image/gif" })).toMatch(/JPG, PNG ou WebP/);
    expect(coverError({ ...ok, size: 0 })).toMatch(/vazia/);
    expect(coverError({ ...ok, size: 2 * 1024 * 1024 + 1 })).toMatch(/2 MB/);
  });

  it("recusa imagem menor que 600×900 e fora da proporção 2:3", () => {
    expect(coverError({ ...ok, width: 400, height: 600 })).toMatch(/600×900/);
    expect(coverError({ ...ok, width: 900, height: 900 })).toMatch(/2:3/);
  });
});

describe("isCoverRatio", () => {
  it("reconhece 2:3 e recusa um quadrado", () => {
    expect(isCoverRatio(600, 900)).toBe(true);
    expect(isCoverRatio(800, 800)).toBe(false);
    expect(isCoverRatio(0, 900)).toBe(false);
  });
});
