import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COLORS, GRID_NOTES, TYPE_STYLES } from "./tokens";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

// Valores da paleta no globals.css, por exemplo --color-navy-500: #3075cf;
function cssColor(group: string, name: string): string | undefined {
  return css.match(new RegExp(`--color-${group}-${name}:\\s*(#[0-9a-fA-F]{6});`))?.[1]?.toUpperCase();
}

describe("tokens do design system", () => {
  it("os hex da paleta batem com o globals.css", () => {
    for (const group of ["navy", "gray", "success", "warning", "danger", "info"]) {
      const found = COLORS.find((item) => item.name === group);
      expect(found, `grupo ${group}`).toBeDefined();
      for (const swatch of found?.swatches ?? []) {
        expect(swatch.hex.toUpperCase(), `${group}-${swatch.name}`).toBe(cssColor(group, swatch.name));
      }
    }
  });

  it("tem os nove estilos de texto do frame, com o Corpo Médio", () => {
    expect(TYPE_STYLES.map((style) => style.name)).toEqual([
      "Título/H1 Marca",
      "Título/H1 Página",
      "Título/H2",
      "Título/H3",
      "Texto/Corpo",
      "Texto/Corpo Médio",
      "Texto/Menu e Botão",
      "Texto/Pequeno",
      "Texto/Legenda",
    ]);
  });

  it("repete as cinco linhas de Grade e telas do frame", () => {
    expect(GRID_NOTES).toHaveLength(5);
    expect(GRID_NOTES[1]).toContain("desktop 1280");
  });
});
