import { describe, expect, it } from "vitest";
import { formatNumber, plural } from "./format";

describe("plural", () => {
  it("usa o singular só para 1", () => {
    expect(plural(1, "exemplar", "exemplares")).toBe("exemplar");
  });

  it.each([0, 2, 10, 1000])("usa o plural para %i", (count) => {
    expect(plural(count, "exemplar", "exemplares")).toBe("exemplares");
  });
});

describe("formatNumber", () => {
  it("separa os milhares com ponto", () => {
    expect(formatNumber(1234)).toBe("1.234");
    expect(formatNumber(12)).toBe("12");
  });

  it("aceita casas decimais", () => {
    expect(formatNumber(8, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe("8,00");
  });
});
