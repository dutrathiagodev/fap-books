import { describe, expect, it } from "vitest";
import { shouldShowWelcome } from "./welcome-rules";

describe("shouldShowWelcome", () => {
  it("mostra no celular quando a pessoa ainda não viu", () => {
    expect(shouldShowWelcome({ isMobile: true, alreadySeen: false })).toBe(true);
  });

  it("não mostra de novo depois de vista", () => {
    expect(shouldShowWelcome({ isMobile: true, alreadySeen: true })).toBe(false);
  });

  it("não mostra no computador", () => {
    expect(shouldShowWelcome({ isMobile: false, alreadySeen: false })).toBe(false);
  });
});
