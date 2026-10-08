// Automações do quadro FAP Books (Trello). Roda em loop externo (GitHub Action a cada 10 min) ou à mão.
// Uso: TRELLO_KEY=... TRELLO_TOKEN=... node scripts/automacoes.mjs [--dry]   |   node scripts/automacoes.mjs --selftest
//
// Regras:
//  1. 🚧 In Progress com dependência ("Depende de: [FAP - N]") fora de ✅ Done        -> 🚫 Blocked
//  2. 📥 Backlog/🚫 Blocked com todas as dependências em ✅ Done                       -> 📝 To Do
//  3. Card pai ("Pai: [FAP - N]" nos filhos) com todos os filhos em ✅ Done            -> ✅ Done (em cascata)
//  4. 🚧 In Progress / 🚫 Blocked: marca quem arrastou o card para In Progress (fica responsável)
//  5. 🔀 Awaiting PR : marca Thiago e quem arrastou o card para lá
//  6. 🔍 Awaiting QA : marca o Breno (QA), inclusive nos cards dele
//  7. ❌ QA Rejected : marca Thiago e quem arrastou o card para Awaiting PR
//  8. ✅ Done        : fica só quem arrastou o card para Awaiting PR (se houver histórico)
const BOARD = '6ac6e9c9b825cc2a16bc7c4f'
const THIAGO = '6515cff8159cb78d54ad4074'
const BRENO = '68ca9fb753f35f1a0a8f2e7e'
const L = { backlog: '📥 Backlog', todo: '📝 To Do', progress: '🚧 In Progress', blocked: '🚫 Blocked', pr: '🔀 Awaiting PR', qa: '🔍 Awaiting QA', rejected: '❌ QA Rejected', done: '✅ Done' }

const num = c => c.name.match(/^\[FAP - (\d+)\]/)?.[1]
const deps = c => [...(c.desc ?? '').matchAll(/Depende de: \[FAP - (\d+)\]/g)].map(m => m[1])
const paiDe = c => c.desc?.match(/Pai: \[FAP - (\d+)\]/)?.[1]
const uniq = a => [...new Set(a)]
const mesmo = (a, b) => a.length === b.length && a.every(x => b.includes(x))

// Planeja tudo a partir do estado (puro, testável). hist(card) -> { pr, progress }: quem moveu o card para Awaiting PR / In Progress (ou undefined).
export function planejar(cards, listas, hist) {
  const nomeDe = Object.fromEntries(listas.map(l => [l.id, l.name]))
  const idDe = Object.fromEntries(listas.map(l => [l.name, l.id]))
  const acoes = []
  const porNum = Object.fromEntries(cards.map(c => [num(c), c]))
  const estaDone = n => nomeDe[porNum[n]?.idList] === L.done
  const mover = (c, lista, motivo) => { acoes.push({ tipo: 'mover', c, lista, motivo }); c.idList = idDe[lista] }

  for (const c of cards) {
    const d = deps(c)
    if (!d.length) continue
    const prontos = d.every(estaDone)
    if (nomeDe[c.idList] === L.progress && !prontos) mover(c, L.blocked, `aguarda ${d.filter(x => !estaDone(x)).map(x => `[FAP - ${x}]`).join(', ')}`)
    else if ([L.backlog, L.blocked].includes(nomeDe[c.idList]) && prontos) mover(c, L.todo, `liberado por ${d.map(x => `[FAP - ${x}]`).join(', ')}`)
  }
  for (;;) {
    const filhos = {}
    for (const c of cards) { const p = paiDe(c); if (p) (filhos[p] ??= []).push(c) }
    const fechar = cards.filter(c => nomeDe[c.idList] !== L.done && filhos[num(c)]?.every(f => nomeDe[f.idList] === L.done))
    if (!fechar.length) break
    for (const c of fechar) mover(c, L.done, `${filhos[num(c)].length} filhos concluídos`)
  }
  for (const c of cards) {
    const lista = nomeDe[c.idList]
    const atual = c.idMembers ?? []
    const h = hist(c) ?? {}
    const autor = h.pr
    let quer = atual
    if ([L.progress, L.blocked].includes(lista) && h.progress) quer = uniq([...atual, h.progress])
    else if (lista === L.pr) quer = uniq([...atual, THIAGO, ...(autor ? [autor] : [])])
    else if (lista === L.qa) quer = uniq([...atual, BRENO])
    else if (lista === L.rejected) quer = uniq([...atual, THIAGO, ...(autor ? [autor] : [])])
    else if (lista === L.done && autor) quer = [autor]
    if (!mesmo(atual, quer)) acoes.push({ tipo: 'membros', c, quer, motivo: `lista ${lista}` })
  }
  return acoes
}

function selftest() {
  const assert = (ok, m) => { if (!ok) throw new Error(`falhou: ${m}`); console.log(`ok - ${m}`) }
  const listas = Object.values(L).map((name, i) => ({ id: `L${i}`, name }))
  const id = n => listas.find(l => l.name === n).id
  const card = (n, lista, desc = '', idMembers = []) => ({ id: `c${n}`, name: `[FAP - ${n}] - x`, desc, idList: id(lista), idMembers })
  const sem = () => ({})
  let a = planejar([card('0001', L.done), card('0002', L.progress, 'Depende de: [FAP - 0001]')], listas, sem)
  assert(a.length === 0, 'dependência pronta mantém In Progress')
  a = planejar([card('0001', L.todo), card('0002', L.progress, 'Depende de: [FAP - 0001]')], listas, sem)
  assert(a.length === 1 && a[0].lista === L.blocked, 'In Progress com dependência pendente vai para Blocked')
  a = planejar([card('0001', L.done), card('0002', L.blocked, 'Depende de: [FAP - 0001]')], listas, sem)
  assert(a[0].lista === L.todo, 'Blocked liberado vai para To Do')
  a = planejar([card('0001', L.todo), card('0002', L.done, 'Pai: [FAP - 0001]'), card('0003', L.todo, 'Pai: [FAP - 0001]')], listas, sem)
  assert(a.length === 0, 'pai não fecha se faltar filho')
  a = planejar([card('0001', L.todo), card('0002', L.done, 'Pai: [FAP - 0001]'), card('0003', L.done, 'Pai: [FAP - 0001]')], listas, sem)
  assert(a[0].lista === L.done, 'pai fecha quando todos os filhos concluem')
  const PR = 'dev1'
  a = planejar([card('0004', L.pr)], listas, () => ({ pr: PR }))
  assert(mesmo(a[0].quer, [THIAGO, PR]), 'Awaiting PR marca Thiago e quem arrastou')
  a = planejar([card('0004', L.qa, '', [PR, THIAGO])], listas, () => ({ pr: PR }))
  assert(a[0].quer.includes(BRENO), 'Awaiting QA marca o Breno')
  a = planejar([card('0004', L.qa, '', [BRENO, THIAGO])], listas, () => ({ pr: BRENO }))
  assert(a.length === 0, 'Awaiting QA: o Breno pode testar o próprio card')
  a = planejar([card('0004', L.rejected, '', [PR, BRENO])], listas, () => ({ pr: PR }))
  assert(a[0].quer.includes(THIAGO) && a[0].quer.includes(PR), 'QA Rejected marca Thiago e o autor do PR')
  a = planejar([card('0004', L.done, '', [PR, THIAGO, BRENO])], listas, () => ({ pr: PR }))
  assert(mesmo(a[0].quer, [PR]), 'Done deixa só quem abriu o PR')
  a = planejar([card('0004', L.done, '', [THIAGO])], listas, sem)
  assert(a.length === 0, 'Done sem histórico não mexe nos membros')
  a = planejar([card('0004', L.pr, '', [PR, THIAGO])], listas, () => ({ pr: PR }))
  assert(a.length === 0, 'idempotente: sem mudança quando já está correto')
  a = planejar([card('0004', L.progress, '', [])], listas, () => ({ progress: 'dev2' }))
  assert(mesmo(a[0].quer, ['dev2']), 'In Progress marca quem arrastou')
  a = planejar([card('0001', L.todo), card('0002', L.progress, 'Depende de: [FAP - 0001]')], listas, () => ({ progress: 'dev2' }))
  assert(a.some(x => x.lista === L.blocked) && a.some(x => x.quer?.includes('dev2')), 'In Progress barrado vai para Blocked e marca quem tentou')
  a = planejar([card('0004', L.progress, '', ['dev2'])], listas, () => ({ progress: 'dev2' }))
  assert(a.length === 0, 'In Progress é idempotente')
}

async function main() {
  const dry = process.argv.includes('--dry')
  const { TRELLO_KEY: key, TRELLO_TOKEN: token } = process.env
  if (!key || !token) throw new Error('Defina TRELLO_KEY e TRELLO_TOKEN')
  const api = async (method, path, params = {}) => {
    const url = new URL(`https://api.trello.com/1${path}`)
    url.search = new URLSearchParams({ ...params, key, token })
    const res = await fetch(url, { method })
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`)
    return res.json()
  }
  const listas = await api('GET', `/boards/${BOARD}/lists`)
  const cards = await api('GET', `/boards/${BOARD}/cards`, { fields: 'name,desc,idList,idMembers' })
  const nomeDe = Object.fromEntries(listas.map(l => [l.id, l.name]))
  const cache = {}
  // Histórico só dos cards que precisam dele (PR, QA, Rejected, Done com membros).
  const alvo = new Set(cards.filter(c => [L.progress, L.blocked, L.pr, L.qa, L.rejected, L.done].includes(nomeDe[c.idList])).map(c => c.id))
  for (const id of alvo) {
    const acts = await api('GET', `/cards/${id}/actions`, { filter: 'updateCard:idList,commentCard', limit: '100' })
    const quem = lista => acts.find(a => a.data?.listAfter?.name === lista)?.idMemberCreator
    // O workflow de PR move o card com o token do Thiago e grava o autor real num comentário "PR-AUTOR: <id>".
    const marcado = acts.find(a => a.type === 'commentCard' && /^PR-AUTOR: \w+/.test(a.data?.text ?? ''))?.data.text.split(' ')[1]
    cache[id] = { pr: marcado ?? quem(L.pr), progress: quem(L.progress) }
  }
  const acoes = planejar(cards, listas, c => cache[c.id])
  const nomes = { [THIAGO]: 'Thiago', [BRENO]: 'Breno' }
  for (const a of acoes) {
    if (a.tipo === 'mover') {
      console.log(`${dry ? '[dry] ' : ''}${a.c.name} -> ${a.lista} (${a.motivo})`)
      if (!dry) await api('PUT', `/cards/${a.c.id}`, { idList: listas.find(l => l.name === a.lista).id })
    } else {
      console.log(`${dry ? '[dry] ' : ''}${a.c.name}: membros -> ${a.quer.map(m => nomes[m] ?? m.slice(-4)).join(', ')} (${a.motivo})`)
      if (!dry) await api('PUT', `/cards/${a.c.id}`, { idMembers: a.quer.join(',') })
    }
  }
  if (!acoes.length) console.log('Nada a fazer.')
}

if (process.argv.includes('--selftest')) selftest()
else if (import.meta.url === `file://${process.argv[1]}`) await main()
