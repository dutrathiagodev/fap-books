// Roda as automações do quadro em sequência: fecha pais concluídos e sobe os próximos cards.
// Uso: node scripts/automacoes.mjs [--dry]
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
for (const s of ['fechar-pais.mjs', 'subir-proximos.mjs']) {
  console.log(`# ${s}`)
  process.stdout.write(execFileSync('node', [join(dir, s), ...process.argv.slice(2)], { encoding: 'utf8' }))
}
