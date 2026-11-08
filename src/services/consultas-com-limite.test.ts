import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Regra do plano gratuito (FAP-0231): nenhuma consulta de leitura fica sem limite. O PostgREST corta em 1000 linhas
// sem avisar, então uma leitura sem limite devolve número errado e pesa cada vez mais com o acervo.
// Uma consulta passa se limita o resultado (.limit, .range), pede uma linha (.single, .maybeSingle) ou só conta (head: true).
//
// Estas são as leituras sem limite que já existiam quando a regra entrou. Elas NÃO podem aumentar; cada uma que for
// trocada por função SQL ou paginação no banco (card 0225, lista 1) deve ser removida daqui. Teto por arquivo:
const LEITURAS_SEM_LIMITE_CONHECIDAS: Record<string, number> = {
  "books.service.ts": 9,
  "loans-lookup.service.ts": 2,
};

const PASTA = __dirname;

// Cada leitura vai de ".select(" até o fim da própria consulta (";", próxima consulta ou o ":" de um ternário).
// Consulta guardada numa variável ("let consulta = ...") é limitada se a variável recebe .limit/.range/.single depois.
function leiturasSemLimite(codigo: string): string[] {
  const achadas: string[] = [];
  let inicio = codigo.indexOf(".select(");
  while (inicio !== -1) {
    const resto = codigo.slice(inicio + 1);
    const fim = resto.search(/;|\.from\(|supabase\.|\s:\s\{|\n\s*\]/);
    const comando = codigo.slice(inicio, fim === -1 ? undefined : inicio + 1 + fim);
    const variavel = /(?:let|const)\s+(\w+)\s*=[^;]*$/.exec(codigo.slice(Math.max(0, inicio - 120), inicio))?.[1];
    const limitadaDepois =
      variavel !== undefined && new RegExp(`\\b${variavel}\\s*(?:=\\s*${variavel})?\\s*\\.(limit|range|single|maybeSingle)\\(`).test(codigo);
    // Só leitura: ".insert(...).select()" e afins devolvem as linhas gravadas, que já são limitadas pela gravação.
    const antes = codigo.slice(Math.max(0, inicio - 200), inicio);
    const eGravacao = /\.(insert|update|upsert|delete)\([^;]*$/.test(antes);
    const limitada = limitadaDepois || /\.(limit|range|single|maybeSingle)\(|head:\s*true/.test(comando);
    if (!eGravacao && !limitada) achadas.push(comando.replace(/\s+/g, " ").slice(0, 100));
    inicio = codigo.indexOf(".select(", inicio + 1);
  }
  return achadas;
}

describe("leituras do banco sempre com limite", () => {
  const arquivos = readdirSync(PASTA).filter((nome) => nome.endsWith(".service.ts"));

  it("encontra os arquivos de serviço", () => {
    expect(arquivos.length).toBeGreaterThan(0);
  });

  it.each(arquivos)("%s não passa do teto de leituras sem limite", (nome) => {
    const achadas = leiturasSemLimite(readFileSync(join(PASTA, nome), "utf8"));
    const teto = LEITURAS_SEM_LIMITE_CONHECIDAS[nome] ?? 0;
    expect(achadas.length, `Leituras sem limite em ${nome}:\n${achadas.join("\n")}`).toBeLessThanOrEqual(teto);
  });

  it("o detector reconhece uma leitura sem limite e uma com limite", () => {
    expect(leiturasSemLimite('await supabase.from("books").select("id");')).toHaveLength(1);
    expect(leiturasSemLimite('await supabase.from("books").select("id").limit(10);')).toHaveLength(0);
    expect(leiturasSemLimite('await supabase.from("books").select("id").eq("id", x).maybeSingle();')).toHaveLength(0);
    expect(leiturasSemLimite('await supabase.from("books").insert(row).select("id").single();')).toHaveLength(0);
    expect(leiturasSemLimite('await supabase.from("books").update(row).eq("id", x).select("id");')).toHaveLength(0);
  });
});
