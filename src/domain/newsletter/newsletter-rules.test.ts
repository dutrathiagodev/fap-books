import { describe, expect, it } from "vitest";
import { cleanName, parseSubscription } from "./newsletter-rules";

const ok = { name: "Ana Souza", email: "ana@exemplo.com", consent: "on", website: "" };

describe("parseSubscription", () => {
  it("aceita uma inscrição válida e normaliza nome e e-mail", () => {
    expect(parseSubscription({ ...ok, name: "  Ana   Souza ", email: " ANA@Exemplo.com " })).toEqual({
      status: "valid",
      data: { email: "ana@exemplo.com", fullName: "Ana Souza" },
    });
  });

  it("trata o campo-isca preenchido como robô", () => {
    expect(parseSubscription({ ...ok, website: "http://spam.example" })).toEqual({ status: "bot" });
  });

  it("recusa nome curto, longo ou que não é texto", () => {
    expect(parseSubscription({ ...ok, name: "A" }).status).toBe("invalid");
    expect(parseSubscription({ ...ok, name: "a".repeat(101) }).status).toBe("invalid");
    expect(parseSubscription({ ...ok, name: null }).status).toBe("invalid");
  });

  it("recusa e-mail inválido ou grande demais", () => {
    for (const email of ["abc", "a@b", "a b@c.com", "@x.com", "a@b.c" + "d".repeat(260)]) {
      expect(parseSubscription({ ...ok, email }).status).toBe("invalid");
    }
  });

  it("exige o aceite do consentimento", () => {
    expect(parseSubscription({ ...ok, consent: null })).toEqual({
      status: "invalid",
      message: "Marque o aceite para receber as novidades.",
    });
    expect(parseSubscription({ ...ok, consent: "yes" }).status).toBe("invalid");
  });
});

describe("cleanName", () => {
  it("troca caracteres de controle por espaço e junta espaços repetidos", () => {
    expect(cleanName("Ana\u0000\n  Souza")).toBe("Ana Souza");
  });
});
