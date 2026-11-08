import { describe, expect, it } from "vitest";
import { DEVELOPMENT_ORIGIN, PRODUCTION_ORIGIN, isAllowedOrigin, resolveSiteOrigin } from "./site-url";

describe("resolveSiteOrigin", () => {
  it("usa o padrão do ambiente quando a variável falta", () => {
    expect(resolveSiteOrigin(undefined, true)).toBe(PRODUCTION_ORIGIN);
    expect(resolveSiteOrigin("", false)).toBe(DEVELOPMENT_ORIGIN);
  });

  it("aceita produção, localhost com porta e previews da Vercel", () => {
    expect(resolveSiteOrigin("https://fap-books.vercel.app", false)).toBe("https://fap-books.vercel.app");
    expect(resolveSiteOrigin("http://localhost:3170", true)).toBe("http://localhost:3170");
    expect(resolveSiteOrigin("https://fap-books-git-fap-0087-dutra.vercel.app", true)).toBe(
      "https://fap-books-git-fap-0087-dutra.vercel.app",
    );
  });

  it("tira barra final, caminho e parâmetros", () => {
    expect(resolveSiteOrigin("https://fap-books.vercel.app/", true)).toBe("https://fap-books.vercel.app");
    expect(resolveSiteOrigin("https://fap-books.vercel.app/login?x=1", true)).toBe("https://fap-books.vercel.app");
  });

  it("recusa origem fora da lista e cai no padrão seguro", () => {
    for (const hostile of [
      "https://evil.com",
      "https://fap-books.vercel.app.evil.com",
      "https://evil.com/fap-books.vercel.app",
      "https://fap-books.vercel.app@evil.com",
      "http://fap-books.vercel.app",
      "https://evilfap-books.vercel.app",
      "http://localhost.evil.com:3000",
      "javascript:alert(1)",
      "não é url",
    ]) {
      expect(resolveSiteOrigin(hostile, true)).toBe(PRODUCTION_ORIGIN);
      expect(resolveSiteOrigin(hostile, false)).toBe(DEVELOPMENT_ORIGIN);
    }
  });
});

describe("isAllowedOrigin", () => {
  it("exige porta no localhost e https na Vercel", () => {
    expect(isAllowedOrigin("http://localhost")).toBe(false);
    expect(isAllowedOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(isAllowedOrigin("http://fap-books.vercel.app")).toBe(false);
  });
});
