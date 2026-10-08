# FAP Books — Histórico da conversa de configuração

Resumo cronológico da sessão de configuração do GitHub, Figma, PRD e backlog. O token do Figma colado no chat foi omitido de propósito (e deve ser revogado).

## 1. Configuração do GitHub

- **Estado inicial:** remote `origin` já apontava para `https://github.com/dutrathiagodev/fap-books.git`; branches `main` e `develop` existiam; usuário git configurado. O GitHub CLI (`gh`) não estava instalado.
- **`gh`:** instalado via `sudo apt install gh` (v2.46.0) e autenticado com `gh auth login` (conta `dutrathiagodev`, escopos `repo`, `workflow`).
- **Sincronização:** `develop` e `main` locais estavam atrasadas; foram atualizadas com `git pull --ff-only`. No remoto já existiam 2 PRs (#1 main→develop e #2 develop→main) e o commit `linguagem` (`app/layout.tsx`).
- **Fluxo definido:** trabalhar na `develop`; entregar na `main` somente via PR `develop` → `main` (a `main` funciona como backup). Esse passo é sempre feito junto com o assistente.

## 2. Proteção da `main`

- A proteção de branch via API retornou 403 (repositório privado em plano gratuito).
- Foi instalado um hook local `pre-push` em `.git/hooks` que bloqueia push direto na `main` (vale só neste computador).
- Havia 4 colaboradores com acesso de escrita: `emanuelbimdeoliveira`, `IgaumSant`, `Brenogruber`, `sousafrancielio`. Eles precisam programar, então não foram rebaixados.
- **Decisão:** tornar o repositório **público**, após checar que não havia `.env`, chaves ou segredos no código nem no histórico.
- **Proteção final:** ruleset "main - so o dono entrega via PR": sem push direto (nem do dono), exclusão e force push bloqueados, PR obrigatório; somente o papel *admin* (dono) pode fazer bypass via PR. A proteção clássica foi removida. Os colaboradores (papel `write`) programam na `develop` e em branches próprias, mas não mergeiam na `main`. O bloqueio contra colaboradores não foi testado.

## 3. Figma e PRD

- O link do Figma não pôde ser lido pelo navegador do app (canvas em branco). Foi recusado o uso de um token de acesso pessoal colado no chat; recomendado revogá-lo e usar o conector oficial (OAuth).
- Com o conector Figma: o arquivo `FAP BOOKS - Gestão para Biblioteca` (file key `xOr6nlx1EqLMYmSJLh4sHI`) tem a página **capa** (apenas o logo) e a página **🖥️ UI web** (node `2292:11299`, referenciada no PRD).
- **PRD v0.3** (`FAP_Books_PRD.pdf`): sistema de gestão e empréstimo de livros da biblioteca da FAP. Stack: Next.js, Node.js, Supabase/PostgreSQL, GitHub, Trello. 32 requisitos funcionais (RF-01 a RF-32) em 7 módulos, requisitos não funcionais, paleta navy (#032B5E, #0D3B6E, #FFFFFF, #8C8C8C). Equipe: Francielo Souza, Thiago Dutra, Julia Wassão, Igor Santana, Breno Gruber, Emanuel do Santos. Pergunta em aberto: mecanismo de envio de WhatsApp.

## 4. Backlog (épicos, features e histórias)

- Gerado a partir do PRD: **8 épicos, 25 features, 47 histórias (80 itens)**.
- Título dos cards: `[FAP - 0001] - o que é`, numeração sequencial contínua.
- Tags: tipo (`ÉPICO`/`FEATURE`/`HISTÓRIA`), épico (`EP: <nome>`), prioridade P0/P1/P2 (MoSCoW), e organização (área, tipo, perfil).
- Épicos: Fundação e Plataforma · Acervo · Usuários · Empréstimos e Devoluções · Reserva Pedagógica · Prazos, Multas e Notificações · Histórico e Relatórios · Painel da Bibliotecária.
- `[FAP - 0065]` (aviso por WhatsApp) está bloqueada até definir a API.
- Arquivos: `docs/backlog/epicos-features-historias.md`, `.json` e `trello-cards.csv`.

## 5. Trello (pendente)

- Listas pedidas (com emoji): 📥 Backlog, 📝 To Do, 🚧 In Progress, 🚫 Blocked, 🔀 Awaiting PR, 🏗️ Awaiting Build, 🔍 Awaiting QA, ❌ QA Rejected, ✅ Done.
- O conector do Trello não estava conectado nesta sessão, então o quadro **não foi criado**. Combinado: fazer em outra sessão, após conectar o Trello. O contexto ficou salvo na memória do projeto.

## 6. Pendências

1. Conectar o Trello e criar o quadro com as 9 listas e os 80 cards.
2. Revogar o token do Figma que foi colado no chat.
3. Commitar `docs/` na `develop` (ainda sem commit) e, ao finalizar uma etapa, abrir PR `develop` → `main` junto com o assistente.
4. Ler as telas da página "🖥️ UI web" do Figma para detalhar as histórias de tela.
5. Definir a API de WhatsApp e a regra de exclusão de livro com empréstimo ativo.
