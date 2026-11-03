import { describe, expect, it } from "vitest";
import { availableCopies } from "./book-rules";

describe("availableCopies (limites)", () => {
  it("sem empréstimo devolve todos os exemplares", () => {
    expect(availableCopies(3, 0)).toBe(3);
  });
});
