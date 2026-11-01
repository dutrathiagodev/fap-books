// Liga cada Pull Request aos cards do Trello que ele cita: o link do PR vira um anexo do card.
// Com o Power-Up do GitHub ligado no quadro, o anexo aparece no card como Pull Request.
// Um PR cita um card pela branch (FAP/<número>), por "FAP-<número>" no título ou por um número de 4 dígitos
// começando em 0 no título (ex.: "telas 0126 e 0135"). O corpo do PR não conta, para não anexar por engano.

export function numerosDoPR(pr) {
  const numeros = new Set()
  const ramo = pr.head?.ref?.match(/^FAP\/(\d{1,4})$/i)?.[1]
  if (ramo) numeros.add(ramo.padStart(4, '0'))
  const titulo = pr.title ?? ''
  for (const m of titulo.matchAll(/FAP[\s-]*(\d{4})/gi)) numeros.add(m[1])
  for (const m of titulo.matchAll(/(?<![\d.])(0\d{3})(?![\d.])/g)) numeros.add(m[1])
  return [...numeros]
}

// Anexa o PR ao card, sem repetir se o link já estiver lá. Devolve true quando anexou.
export async function anexarPR(api, cardId, pr) {
  const existentes = await api('GET', `/cards/${cardId}/attachments`, { fields: 'url' })
  if (existentes.some(a => a.url === pr.html_url)) return false
  await api('POST', `/cards/${cardId}/attachments`, { url: pr.html_url, name: `PR #${pr.number}: ${pr.title}` })
  return true
}

// Cliente simples da API do Trello. O Trello limita as chamadas (429): espera e tenta de novo até 5 vezes.
export function criarApi(key, token) {
  return async (method, path, params = {}) => {
    const url = new URL(`https://api.trello.com/1${path}`)
    url.search = new URLSearchParams({ ...params, key, token })
    for (let t = 1; ; t++) {
      const res = await fetch(url, { method })
      if (res.ok) return res.json()
      if ((res.status === 429 || res.status >= 500) && t < 5) {
        await new Promise(r => setTimeout(r, t * 3000))
        continue
      }
      throw new Error(`${method} ${path} -> ${res.status}`)
    }
  }
}

export function selftestAnexos() {
  const ok = (c, m) => { if (!c) throw new Error(`falhou: ${m}`); console.log(`ok - ${m}`) }
  const pr = (head, title) => ({ head: { ref: head }, title })
  ok(numerosDoPR(pr('FAP/0104', 'feat: algo')).join() === '0104', 'extrai o card da branch FAP/<número>')
  ok(numerosDoPR(pr('docs/x', 'feat: estados (FAP-0104)')).join() === '0104', 'extrai o card de FAP-<número> no título')
  ok(numerosDoPR(pr('docs/x', 'docs: telas 0126, 0135 e 0157')).join() === '0126,0135,0157', 'extrai vários cards de números soltos no título')
  ok(numerosDoPR(pr('FAP/0102', 'feat: menu (FAP-0102 e FAP-0103)')).join() === '0102,0103', 'junta branch e título sem repetir')
  ok(numerosDoPR(pr('docs/x', 'release: v0.5.0 de 2026')).length === 0, 'versão e ano não viram card')
  ok(numerosDoPR(pr('feature/x', 'docs: ajuste')).length === 0, 'PR sem card não anexa nada')
}
