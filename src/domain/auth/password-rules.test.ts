import { describe, expect, it } from "vitest";
import { isPasswordValid, validatePassword } from "./password-rules";

describe("validatePassword", () => {
  it("aceita 8 caracteres iguais nos dois campos, sem exigir símbolos", () => {
    const check = validatePassword("abcdefgh", "abcdefgh");
    expect(check).toEqual({ password: null, confirmation: null });
    expect(isPasswordValid(check)).toBe(true);
  });

  it("aceita frase longa com espaços e acentos", () => {
    expect(isPasswordValid(validatePassword("minha biblioteca é ótima", "minha biblioteca é ótima"))).toBe(true);
  });

  it("recusa menos de 8 caracteres", () => {
    expect(validatePassword("abc1234", "abc1234").password).toBe("too_short");
    expect(validatePassword("", "").password).toBe("too_short");
  });

  it("conta caracteres, não bytes, para o mínimo", () => {
    expect(validatePassword("ééééééé", "ééééééé").password).toBe("too_short");
    expect(validatePassword("éééééééé", "éééééééé").password).toBeNull();
  });

  it("recusa senha só de espaços", () => {
    expect(validatePassword("        ", "        ").password).toBe("blank");
  });

  it("recusa mais de 72 bytes (limite do Supabase) e aceita exatamente 72", () => {
    expect(validatePassword("a".repeat(72), "a".repeat(72)).password).toBeNull();
    expect(validatePassword("a".repeat(73), "a".repeat(73)).password).toBe("too_long");
    expect(validatePassword("é".repeat(37), "é".repeat(37)).password).toBe("too_long");
  });

  it("recusa confirmação diferente", () => {
    const check = validatePassword("abcdefgh", "abcdefgi");
    expect(check.confirmation).toBe("mismatch");
    expect(isPasswordValid(check)).toBe(false);
  });
});
