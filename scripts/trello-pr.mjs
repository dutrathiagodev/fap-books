// Reage a eventos de Pull Request movendo o card do Trello cuja branch é FAP/<número>.
//   PR aberto/reaberto/pronto para revisão -> 🔀 Awaiting PR (marca Thiago + autor do PR)
//   PR mergeado                            -> 🏗️ Awaiting Build
//   PR fechado sem merge                   -> 🚧 In Progress
// Uso no workflow: node scripts/trello-pr.mjs   (lê GITHUB_EVENT_PATH)   |   node scripts/trello-pr.mjs --selftest
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BOARD = '6ac6e9c9b825cc2a16bc7c4f'
const THIAGO = '6515cff8159cb78d54ad4074'
const usuarios = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'usuarios.json'), 'utf8')).github_para_trello

export function decidir(ev) {
  const pr = ev.pull_request
  const n = pr?.head?.ref?.match(/^FAP\/(\d{1,4})$/i)?.[1]
  if (!n) return null
  const card = n.padStart(4, '0')
  const autor = usuarios[pr.user.login.toLowerCase()]
  if (ev.action === 'closed') {
    return pr.merged ? { card, lista: '🏗️ Awaiting Build' } : { card, lista: '🚧 In Progress' }
  }
  if (['opened', 'reopened', 'ready_for_review'].includes(ev.action) && !pr.draft) {
    return { card, lista: '🔀 Awaiting PR', membros: [THIAGO, ...(autor ? [autor] : [])], autor, login: pr.user.login }
  }
  return null
}

function selftest() {
  const ok = (c, m) => { if (!c) throw new Error(`falhou: ${m}`); console.log(`ok - ${m}`) }
  const ev = (action, extra = {}, ref = 'FAP/0003') => ({ action, pull_request: { head: { ref }, user: { login: 'Brenogruber' }, draft: false, merged: false, ...extra } })
  ok(decidir(ev('opened')).lista === '🔀 Awaiting PR', 'PR aberto vai para Awaiting PR')
  ok(decidir(ev('opened')).membros.includes('68ca9fb753f35f1a0a8f2e7e'), 'marca o autor do PR (login sem diferenciar maiúsculas)')
  ok(decidir(ev('opened')).card === '0003', 'extrai o número do card da branch')
  ok(decidir(ev('closed', { merged: true })).lista === '🏗️ Awaiting Build', 'PR mergeado vai para Awaiting Build')
  ok(decidir(ev('closed')).lista === '🚧 In Progress', 'PR fechado sem merge volta para In Progress')
  ok(decidir(ev('opened', {}, 'feature/x')) === null, 'branch fora do padrão é ignorada')
  ok(decidir(ev('opened', { draft: true })) === null, 'PR em rascunho é ignorado')
  ok(decidir(ev('opened', { user: { login: 'alguem-sem-mapa' } })).membros.length === 1, 'autor sem mapeamento só marca o Thiago')
}

async function main() {
  const { TRELLO_KEY: key, TRELLO_TOKEN: token, GITHUB_EVENT_PATH } = process.env
  if (!key || !token) throw new Error('Defina TRELLO_KEY e TRELLO_TOKEN')
  const d = decidir(JSON.parse(readFileSync(GITHUB_EVENT_PATH, 'utf8')))
  if (!d) return console.log('Evento ignorado (branch fora do padrão FAP/<número> ou sem ação).')
  const api = async (method, path, params = {}) => {
    const url = new URL(`https://api.trello.com/1${path}`)
    url.search = new URLSearchParams({ ...params, key, token })
    const res = await fetch(url, { method })
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`)
    return res.json()
  }
  const listas = await api('GET', `/boards/${BOARD}/lists`)
  const cards = await api('GET', `/boards/${BOARD}/cards`, { fields: 'name,idList,idMembers' })
  const card = cards.find(c => c.name.startsWith(`[FAP - ${d.card}]`))
  if (!card) return console.log(`Card [FAP - ${d.card}] não encontrado.`)
  const lista = listas.find(l => l.name === d.lista)
  const params = { idList: lista.id }
  if (d.membros) params.idMembers = [...new Set([...card.idMembers, ...d.membros])].join(',')
  await api('PUT', `/cards/${card.id}`, params)
  // Registra o autor real do PR: o movimento é feito pelo token do Thiago, então o histórico sozinho não diz quem abriu.
  if (d.autor) await api('POST', `/cards/${card.id}/actions/comments`, { text: `PR-AUTOR: ${d.autor}` })
  else if (d.login) console.log(`Aviso: ${d.login} não está em scripts/usuarios.json; o autor não foi marcado.`)
  console.log(`[FAP - ${d.card}] -> ${d.lista}`)
}

if (process.argv.includes('--selftest')) selftest()
else await main()
