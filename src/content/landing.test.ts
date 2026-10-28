import { describe, expect, it } from "vitest";
import { CONTACTS, FAQ, NUMBERS, OPENING_HOURS, RESOURCE_TABS } from "./landing";

describe("conteúdo da landing", () => {
  it("só usa links de contato com esquema seguro", () => {
    for (const { href } of CONTACTS) {
      expect(href).toMatch(/^(mailto:|tel:\+?\d+$|https:\/\/)/);
    }
  });

  it("não deixa título, resposta ou horário em branco", () => {
    for (const { question, answer } of FAQ) {
      expect(question.trim()).not.toBe("");
      expect(answer.trim()).not.toBe("");
    }
    for (const { days, hours } of OPENING_HOURS) {
      expect(days.trim()).not.toBe("");
      expect(hours.trim()).not.toBe("");
    }
  });

  it("usa ids de aba únicos", () => {
    const ids = RESOURCE_TABS.map((tab) => tab.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("repete as regras do Regulamento 2025 (7 dias, 3 livros, R$ 1,00)", () => {
    const values = NUMBERS.map((n) => n.value);
    expect(values).toEqual(expect.arrayContaining(["7 dias", "3 livros", "R$ 1,00"]));
  });
});
