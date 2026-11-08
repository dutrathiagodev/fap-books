#!/usr/bin/env node
// Prova de carga simples [FAP - 0232]: dispara requisições em paralelo contra UMA rota e mede o tempo.
// Meta do card 0225: p95 abaixo de 500 ms e nenhum erro com 50 usuários simultâneos (acervo de 20 mil livros).
//
// SEGURANÇA: por padrão só aceita localhost. Rodar contra staging ou produção exige PROVA_HOSTS_PERMITIDOS com o
// host (decisão do dono do projeto) e, mesmo assim, o teto é de 50 usuários simultâneos e 60 segundos.
//
// Uso:
//   node scripts/prova-de-carga.mjs http://localhost:3000/aluno/livros [--usuarios 50] [--segundos 20]
// Rotas de aluno e funcionário pedem login: entre no navegador, copie o cookie da sessão e passe em
//   PROVA_COOKIE='sb-...-auth-token=...' node scripts/prova-de-carga.mjs ...
// Para criar os 20 mil livros de teste (só em banco local): scripts/seed-carga.sql. Veja docs/infra-e-plano-gratuito.md.
import { performance } from "node:perf_hooks";

const MAX_USUARIOS = 50;
const MAX_SEGUNDOS = 60;
const META_P95_MS = 500;

function argumento(nome, padrao) {
  const i = process.argv.indexOf(`--${nome}`);
  return i === -1 ? padrao : Number(process.argv[i + 1]);
}

const alvo = process.argv[2];
if (!alvo || alvo.startsWith("--")) {
  console.error("Uso: node scripts/prova-de-carga.mjs <url> [--usuarios 50] [--segundos 20]");
  process.exit(2);
}

let url;
try {
  url = new URL(alvo);
} catch {
  console.error(`URL inválida: ${alvo}`);
  process.exit(2);
}

const locais = new Set(["localhost", "127.0.0.1", "[::1]"]);
const permitidos = new Set((process.env.PROVA_HOSTS_PERMITIDOS ?? "").split(",").map((h) => h.trim()).filter(Boolean));
if (!locais.has(url.hostname) && !permitidos.has(url.hostname)) {
  console.error(
    `Recusado: ${url.hostname} não é local. A prova de carga contra staging ou produção só roda com a autorização do dono:\n` +
      `PROVA_HOSTS_PERMITIDOS=${url.hostname} node scripts/prova-de-carga.mjs ...`,
  );
  process.exit(2);
}

const usuarios = Math.min(Math.max(1, Math.trunc(argumento("usuarios", 10))), MAX_USUARIOS);
const segundos = Math.min(Math.max(1, Math.trunc(argumento("segundos", 20))), MAX_SEGUNDOS);
const cabecalhos = process.env.PROVA_COOKIE ? { cookie: process.env.PROVA_COOKIE } : {};

const tempos = [];
let erros = 0;
const fim = performance.now() + segundos * 1000;

async function usuario() {
  while (performance.now() < fim) {
    const inicio = performance.now();
    try {
      // redirect "manual": um 307 para /login (cookie ausente ou vencido) conta como erro, não como página.
      const resposta = await fetch(url, { headers: cabecalhos, redirect: "manual" });
      await resposta.arrayBuffer();
      if (resposta.status !== 200) erros += 1;
    } catch {
      erros += 1;
    }
    tempos.push(performance.now() - inicio);
  }
}

console.log(`Prova de carga: ${url.href} | ${usuarios} usuários simultâneos | ${segundos} s`);
await Promise.all(Array.from({ length: usuarios }, usuario));

tempos.sort((a, b) => a - b);
const percentil = (p) => tempos[Math.min(tempos.length - 1, Math.ceil((p / 100) * tempos.length) - 1)];
const p95 = percentil(95);
const porSegundo = (tempos.length / segundos).toFixed(1);

console.log(`Requisições: ${tempos.length} (${porSegundo}/s) | erros: ${erros}`);
console.log(`Tempo (ms): p50 ${percentil(50).toFixed(0)} | p95 ${p95.toFixed(0)} | p99 ${percentil(99).toFixed(0)} | máx ${tempos.at(-1).toFixed(0)}`);

const passou = erros === 0 && p95 < META_P95_MS;
console.log(passou ? `OK: p95 abaixo de ${META_P95_MS} ms e sem erro.` : `FALHOU: meta é p95 < ${META_P95_MS} ms e zero erro.`);
process.exit(passou ? 0 : 1);
