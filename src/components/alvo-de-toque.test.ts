import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Alvo de toque de 44 px (FAP-0269). Em 768 px o layout é de tablet, e o tablet usa toque.
// Por isso o tamanho encolhido do desktop vale só com mouse (`mouse:`, definida em globals.css),
// nunca por largura (`md:`, `sm:`). Este teste impede a volta do padrão antigo.

const RAIZ = join(__dirname, "..");

function arquivosTsx(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosTsx(caminho);
    return caminho.endsWith(".tsx") ? [caminho] : [];
  });
}

describe("alvo de toque de 44 px", () => {
  it("define a variante mouse: (tela larga com ponteiro fino)", () => {
    const css = readFileSync(join(RAIZ, "app/globals.css"), "utf8");
    expect(css).toMatch(/@custom-variant mouse \(@media \(min-width: 48rem\) and \(pointer: fine\)\)/);
  });

  it("não encolhe um alvo de 44 px por largura de tela (use mouse:, não md:/sm:)", () => {
    const infratores: string[] = [];
    for (const arquivo of arquivosTsx(RAIZ)) {
      readFileSync(arquivo, "utf8")
        .split("\n")
        .forEach((linha, i) => {
          const base44 = /\b(h|size|min-h)-11\b/.test(linha);
          const encolhePorLargura = /\b(sm|md):(h|size|min-h|min-w)-(\d+|\[\d+px\])\b/.test(linha);
          if (base44 && encolhePorLargura) infratores.push(`${arquivo.replace(RAIZ, "src")}:${i + 1}`);
        });
    }
    expect(infratores).toEqual([]);
  });
});
