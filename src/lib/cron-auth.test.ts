import { describe, expect, it } from "vitest";
import { isValidCronAuthorization } from "./cron-auth";

const SECRET = "s".repeat(40);

describe("isValidCronAuthorization", () => {
  it("aceita o segredo certo", () => {
    expect(isValidCronAuthorization(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("recusa segredo errado, sem cabeçalho e formato diferente de Bearer", () => {
    expect(isValidCronAuthorization(`Bearer ${"x".repeat(40)}`, SECRET)).toBe(false);
    expect(isValidCronAuthorization(null, SECRET)).toBe(false);
    expect(isValidCronAuthorization(SECRET, SECRET)).toBe(false);
    expect(isValidCronAuthorization("Bearer ", SECRET)).toBe(false);
  });

  it("sem segredo configurado, ou curto demais, a rota fica fechada", () => {
    expect(isValidCronAuthorization("Bearer ", "")).toBe(false);
    expect(isValidCronAuthorization("Bearer abc", undefined)).toBe(false);
    expect(isValidCronAuthorization("Bearer abc", "abc")).toBe(false);
  });
});
