// Envia o backlog para o Trello usando a CLI (`trello`, já autenticada).
// Uso: node scripts/enviar-trello.mjs descrever | design [arquivo.json] [lista] | mover "<lista>" 0003 0004
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const BIN = '/home/linuxbrew/.linuxbrew/bin/trello'
const BOARD = '6ac6e9c9b825cc2a16bc7c4f'
const tr = (...a) => {
  const out = JSON.parse(execFileSync(BIN, a, { encoding: 'utf8' }))
  if (!out.ok) throw new Error(`${a.slice(0, 2).join(' ')}: ${JSON.stringify(out.error)}`)
  return out.data
}
const lists = tr('lists', 'list', '--board', BOARD)
const listId = n => (lists.find(l => l.name === n) ?? (() => { throw new Error(`lista ${n}`) })()).id
const cards = () => tr('cards', 'list', '--board', BOARD)
const num = c => c.name.match(/^\[FAP - (\d+)\]/)?.[1]
const [cmd, ...args] = process.argv.slice(2)

if (cmd === 'descrever') {
  const map = JSON.parse(readFileSync('docs/backlog/descricoes-epicos-features.json', 'utf8'))
  const byNum = Object.fromEntries(cards().map(c => [num(c), c]))
  for (const [n, desc] of Object.entries(map)) {
    if (!byNum[n]) { console.log(`? ${n}`); continue }
    tr('cards', 'update', '--card', byNum[n].id, '--desc', desc)
    console.log(`descrição: ${byNum[n].name}`)
  }
} else if (cmd === 'mover') {
  const [dest, ...nums] = args
  const byNum = Object.fromEntries(cards().map(c => [num(c), c]))
  for (const n of nums) {
    const c = byNum[n.padStart(4, '0')]
    if (!c) { console.log(`? ${n}`); continue }
    tr('cards', 'move', '--card', c.id, '--list', listId(dest))
    console.log(`${c.name} -> ${dest}`)
  }
} else if (cmd === 'design') {
  const itens = JSON.parse(readFileSync(args[0] ?? 'docs/backlog/design-telas.json', 'utf8'))
  const existentes = cards()
  let next = Math.max(0, ...existentes.map(c => +num(c) || 0))
  const labels = tr('labels', 'list', '--board', BOARD)
  const labelId = n => {
    let l = labels.find(x => x.name === n)
    if (!l) { l = tr('labels', 'create', '--board', BOARD, '--name', n, '--color', ({ DESIGN: 'pink', BLOCO: 'lime', FRONT: 'sky', TELA: 'purple', CONFIG: 'orange' })[n] ?? 'black'); labels.push(l) }
    return l.id
  }
  const back = listId(args[1] ?? '📥 Backlog')
  for (const it of itens) {
    const name = `[FAP - ${String(++next).padStart(4, '0')}] - ${it.titulo}`
    if (existentes.some(c => c.name === name)) { console.log(`já existe: ${name}`); continue }
    const ids = it.etiquetas.split(',').map(s => s.trim()).filter(Boolean).map(labelId).join(',')
    const card = tr('cards', 'create', '--list', back, '--name', name, '--desc', it.descricao, '--labels', ids, ...(it.membros ? ['--members', it.membros] : []))
    if (it.checklist?.length) {
      const cl = tr('checklists', 'create', '--card', card.id, '--name', 'Critérios de aceite')
      for (const i of it.checklist) tr('checklists', 'items', 'add', '--checklist', cl.id, '--name', i)
    }
    console.log(name)
  }
} else console.log('Comandos: descrever | design [arquivo.json] [lista] | mover "<lista>" <numeros...>')
