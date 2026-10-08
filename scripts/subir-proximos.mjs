// Regras de dependência ("Depende de: [FAP - NNNN]" na descrição do card, várias linhas permitidas):
//  1. 🚧 In Progress com dependência fora de ✅ Done  -> 🚫 Blocked
//  2. 📥 Backlog ou 🚫 Blocked com todas as dependências em ✅ Done -> 📝 To Do
// Uso: node scripts/subir-proximos.mjs [--dry]
import { execFileSync } from 'node:child_process'

const BIN = '/home/linuxbrew/.linuxbrew/bin/trello'
const BOARD = '6ac6e9c9b825cc2a16bc7c4f'
const dry = process.argv.includes('--dry')
const tr = (...a) => {
  const out = JSON.parse(execFileSync(BIN, a, { encoding: 'utf8' }))
  if (!out.ok) throw new Error(JSON.stringify(out.error))
  return out.data
}
const lists = tr('lists', 'list', '--board', BOARD)
const id = n => lists.find(l => l.name === n).id
const [BACKLOG, TODO, DONE, PROGRESS, BLOCKED] = ['📥 Backlog', '📝 To Do', '✅ Done', '🚧 In Progress', '🚫 Blocked'].map(id)
const num = c => c.name.match(/^\[FAP - (\d+)\]/)?.[1]
const deps = c => [...(c.desc ?? '').matchAll(/Depende de: \[FAP - (\d+)\]/g)].map(m => m[1])

const cards = tr('cards', 'list', '--board', BOARD)
const porNum = Object.fromEntries(cards.map(c => [num(c), c]))
const prontos = c => deps(c).every(d => porNum[d]?.idList === DONE)
const mover = (c, lista, nome, motivo) => {
  console.log(`${dry ? '[dry] ' : ''}${c.name} -> ${nome} (${motivo})`)
  if (!dry) tr('cards', 'move', '--card', c.id, '--list', lista)
}
const faltam = c => deps(c).filter(d => porNum[d]?.idList !== DONE).map(d => `[FAP - ${d}]`).join(', ')
let n = 0
for (const c of cards) {
  if (!deps(c).length) continue
  if (c.idList === PROGRESS && !prontos(c)) { mover(c, BLOCKED, '🚫 Blocked', `aguarda ${faltam(c)}`); n++ }
  else if ([BACKLOG, BLOCKED].includes(c.idList) && prontos(c)) { mover(c, TODO, '📝 To Do', `liberado por ${deps(c).map(d => `[FAP - ${d}]`).join(', ')}`); n++ }
}
if (!n) console.log('Nenhum card a mover.')
