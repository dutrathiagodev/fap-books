// Move para ✅ Done todo card pai cujos filhos estejam todos em ✅ Done.
// A relação vem da descrição do filho: "Pai: [FAP - NNNN]". Sobe em cascata (história → feature → épico; bloco → tela).
// Uso: node scripts/fechar-pais.mjs [--dry]
import { execFileSync } from 'node:child_process'

const BIN = '/home/linuxbrew/.linuxbrew/bin/trello'
const BOARD = '6ac6e9c9b825cc2a16bc7c4f'
const DONE = '✅ Done'
const dry = process.argv.includes('--dry')
const tr = (...a) => {
  const out = JSON.parse(execFileSync(BIN, a, { encoding: 'utf8' }))
  if (!out.ok) throw new Error(JSON.stringify(out.error))
  return out.data
}
const doneId = tr('lists', 'list', '--board', BOARD).find(l => l.name === DONE).id
const num = c => c.name.match(/^\[FAP - (\d+)\]/)?.[1]
const paiDe = c => c.desc?.match(/Pai: \[FAP - (\d+)\]/)?.[1]

let cards = tr('cards', 'list', '--board', BOARD)
for (let rodada = 1; ; rodada++) {
  const filhos = {}
  for (const c of cards) { const p = paiDe(c); if (p) (filhos[p] ??= []).push(c) }
  const fechar = cards.filter(c => c.idList !== doneId && filhos[num(c)]?.every(f => f.idList === doneId))
  if (!fechar.length) break
  for (const c of fechar) {
    console.log(`${dry ? '[dry] ' : ''}${c.name} -> ${DONE} (${filhos[num(c)].length} filhos concluídos)`)
    if (!dry) tr('cards', 'move', '--card', c.id, '--list', doneId)
    c.idList = doneId
  }
}
console.log('Nada mais a fechar.')
