// Sobe para 📝 To Do os cards do 📥 Backlog cujas dependências estão todas em ✅ Done.
// A dependência vem da descrição do card: "Depende de: [FAP - NNNN]" (várias linhas permitidas).
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
const [BACKLOG, TODO, DONE] = ['📥 Backlog', '📝 To Do', '✅ Done'].map(id)
const num = c => c.name.match(/^\[FAP - (\d+)\]/)?.[1]
const deps = c => [...(c.desc ?? '').matchAll(/Depende de: \[FAP - (\d+)\]/g)].map(m => m[1])

const cards = tr('cards', 'list', '--board', BOARD)
const porNum = Object.fromEntries(cards.map(c => [num(c), c]))
const liberar = cards.filter(c => c.idList === BACKLOG && deps(c).length && deps(c).every(d => porNum[d]?.idList === DONE))
for (const c of liberar) {
  console.log(`${dry ? '[dry] ' : ''}${c.name} -> 📝 To Do (liberado por ${deps(c).map(d => `[FAP - ${d}]`).join(', ')})`)
  if (!dry) tr('cards', 'move', '--card', c.id, '--list', TODO)
}
if (!liberar.length) console.log('Nenhum card a subir.')
