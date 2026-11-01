// Varre todos os Pull Requests do repositório e anexa cada um aos cards do Trello que ele cita (ver trello-anexos.mjs).
// Serve para ligar os PRs antigos aos cards; os PRs novos são ligados pelo workflow "Trello - Pull Requests".
// Uso: node scripts/trello-anexar-prs.mjs            (anexa de verdade; precisa de TRELLO_KEY e TRELLO_TOKEN)
//      node scripts/trello-anexar-prs.mjs --simular  (só mostra o que seria anexado; não usa o Trello)
import { numerosDoPR, anexarPR, criarApi, selftestAnexos } from './trello-anexos.mjs'

const BOARD = '6ac6e9c9b825cc2a16bc7c4f'
const { TRELLO_KEY: key, TRELLO_TOKEN: token, GITHUB_TOKEN: gh, GITHUB_REPOSITORY: repo = 'dutrathiagodev/fap-books' } = process.env

async function todosOsPRs() {
  const prs = []
  for (let pagina = 1; ; pagina++) {
    const res = await fetch(`https://api.github.com/repos/${repo}/pulls?state=all&per_page=100&page=${pagina}`, {
      headers: { Accept: 'application/vnd.github+json', ...(gh ? { Authorization: `Bearer ${gh}` } : {}) },
    })
    if (!res.ok) throw new Error(`GitHub -> ${res.status}`)
    const lote = await res.json()
    prs.push(...lote)
    if (lote.length < 100) return prs.sort((a, b) => a.number - b.number)
  }
}

async function main() {
  if (process.argv.includes('--selftest')) return selftestAnexos()
  const simular = process.argv.includes('--simular')
  if (!simular && (!key || !token)) throw new Error('Defina TRELLO_KEY e TRELLO_TOKEN (ou use --simular)')
  const prs = (await todosOsPRs()).filter(pr => numerosDoPR(pr).length)
  console.log(`${prs.length} PRs citam algum card.`)
  if (simular) {
    for (const pr of prs) console.log(`#${pr.number} -> ${numerosDoPR(pr).join(', ')}  (${pr.title})`)
    return
  }
  const api = criarApi(key, token)
  const cards = await api('GET', `/boards/${BOARD}/cards`, { fields: 'name' })
  let anexados = 0
  for (const pr of prs) {
    for (const n of numerosDoPR(pr)) {
      const card = cards.find(c => c.name.startsWith(`[FAP - ${n}]`))
      if (!card) { console.log(`#${pr.number}: card [FAP - ${n}] não encontrado.`); continue }
      if (await anexarPR(api, card.id, pr)) { anexados++; console.log(`#${pr.number} anexado a [FAP - ${n}]`) }
    }
  }
  console.log(`Pronto: ${anexados} anexos novos.`)
}

await main()
