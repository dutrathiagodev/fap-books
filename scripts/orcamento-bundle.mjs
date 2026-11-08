#!/usr/bin/env node
// Orçamento de desempenho no CI [FAP - 0232]: falha se o JavaScript que o navegador baixa crescer sem querer.
// Soma o tamanho comprimido (gzip, como a Vercel entrega) de todos os arquivos .js de .next/static e compara com
// o teto abaixo. Rode depois do "npm run build". Para ver o que pesa: npx next analyze (veja docs/infra-e-plano-gratuito.md).
//
// Subiu de propósito (nova biblioteca, nova tela)? Aumente o teto neste arquivo, no mesmo PR, explicando o motivo.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const PASTA = ".next/static";
// Medido na build de 08/11/2026 (v0.6.0) com folga de ~15%.
const TETO_TOTAL_KB = 380;
const TETO_MAIOR_ARQUIVO_KB = 95;

function arquivosJs(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivosJs(caminho);
    return nome.endsWith(".js") ? [caminho] : [];
  });
}

let arquivos;
try {
  arquivos = arquivosJs(PASTA);
} catch {
  console.error(`Pasta ${PASTA} não existe. Rode "npm run build" antes.`);
  process.exit(2);
}

const medidos = arquivos
  .map((caminho) => ({ caminho, kb: gzipSync(readFileSync(caminho)).length / 1024 }))
  .sort((a, b) => b.kb - a.kb);
const totalKb = medidos.reduce((soma, { kb }) => soma + kb, 0);

console.log(`JavaScript do navegador: ${totalKb.toFixed(0)} KB gzip em ${medidos.length} arquivos (teto ${TETO_TOTAL_KB} KB)`);
console.log(`Maior arquivo: ${medidos[0].caminho} com ${medidos[0].kb.toFixed(0)} KB (teto ${TETO_MAIOR_ARQUIVO_KB} KB)`);

const falhas = [];
if (totalKb > TETO_TOTAL_KB) falhas.push(`total de ${totalKb.toFixed(0)} KB passa de ${TETO_TOTAL_KB} KB`);
if (medidos[0].kb > TETO_MAIOR_ARQUIVO_KB) falhas.push(`${medidos[0].caminho} passa de ${TETO_MAIOR_ARQUIVO_KB} KB`);
if (falhas.length > 0) {
  console.error(`Orçamento estourado: ${falhas.join("; ")}.`);
  process.exit(1);
}
console.log("Dentro do orçamento.");
