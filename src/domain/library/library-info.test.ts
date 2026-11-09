import { describe, expect, it } from "vitest";
import { isLibraryOpen } from "./library-info";

// Horários dados em Brasília (UTC−3).
const at = (isoLocal: string) => new Date(`${isoLocal}-03:00`);

describe("isLibraryOpen", () => {
  it.each([
    ["2026-11-09T08:00:00", true], // segunda, abre às 8h
    ["2026-11-09T07:59:00", false],
    ["2026-11-09T22:29:00", true],
    ["2026-11-09T22:30:00", false], // fecha às 22h30
    ["2026-11-12T20:00:00", true], // quinta
    ["2026-11-13T16:29:00", true], // sexta fecha às 16h30
    ["2026-11-13T16:30:00", false],
    ["2026-11-14T10:00:00", false], // sábado fechada
    ["2026-11-15T13:29:00", false], // domingo abre às 13h30
    ["2026-11-15T13:30:00", true],
    ["2026-11-15T18:00:00", false],
  ])("%s -> %s", (iso, expected) => {
    expect(isLibraryOpen(at(iso))).toBe(expected);
  });

  it("conta pelo horário de Brasília, não pelo do aparelho", () => {
    // 02:00 UTC de terça é 23:00 de segunda em Brasília: já fechou.
    expect(isLibraryOpen(new Date("2026-11-10T02:00:00Z"))).toBe(false);
    // 12:00 UTC é 09:00 em Brasília: aberta.
    expect(isLibraryOpen(new Date("2026-11-10T12:00:00Z"))).toBe(true);
  });
});
