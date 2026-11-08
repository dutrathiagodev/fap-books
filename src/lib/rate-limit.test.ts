import { describe, expect, it } from "vitest";
import { createRateLimiter, getClientIp, tooManyRequestsMessage } from "./rate-limit";

function relogio(inicio = 1_000_000) {
  let agora = inicio;
  return { now: () => agora, avancar: (ms: number) => (agora += ms) };
}

describe("createRateLimiter", () => {
  it("deixa passar até o limite e barra a tentativa seguinte", () => {
    const r = relogio();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 }, r.now);
    expect([1, 2, 3].map(() => limiter.check("ip").allowed)).toEqual([true, true, true]);
    expect(limiter.check("ip")).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("informa quanto falta para a janela acabar", () => {
    const r = relogio();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 }, r.now);
    limiter.check("ip");
    r.avancar(45_500);
    expect(limiter.check("ip")).toEqual({ allowed: false, retryAfterSeconds: 15 });
  });

  it("libera de novo quando a janela acaba", () => {
    const r = relogio();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 }, r.now);
    limiter.check("ip");
    expect(limiter.check("ip").allowed).toBe(false);
    r.avancar(60_000);
    expect(limiter.check("ip").allowed).toBe(true);
  });

  it("conta cada IP separado", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 }, relogio().now);
    limiter.check("a");
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
  });

  it("não passa do teto de chaves guardadas", () => {
    const r = relogio();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 }, r.now, 3);
    for (const ip of ["a", "b", "c", "d"]) limiter.check(ip);
    // "a" foi a mais antiga e saiu para dar lugar a "d": volta a ter tentativa.
    expect(limiter.check("a").allowed).toBe(true);
    // "d" ainda está sendo contada.
    expect(limiter.check("d").allowed).toBe(false);
  });
});

describe("getClientIp", () => {
  const com = (cabecalhos: Record<string, string>) => new Headers(cabecalhos);

  it("usa o primeiro endereço do x-forwarded-for", () => {
    expect(getClientIp(com({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });
  it("cai para o x-real-ip", () => {
    expect(getClientIp(com({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
  });
  it("sem cabeçalho, todos dividem a chave 'desconhecido'", () => {
    expect(getClientIp(com({}))).toBe("desconhecido");
  });
});

describe("tooManyRequestsMessage", () => {
  it("fala em instantes para esperas curtas", () => {
    expect(tooManyRequestsMessage(30)).toBe("Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente de novo.");
  });
  it("fala em minutos para esperas longas", () => {
    expect(tooManyRequestsMessage(420)).toBe("Muitas tentativas em pouco tempo. Aguarde 7 minutos e tente de novo.");
  });
});
