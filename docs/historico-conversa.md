# FAP Books — Histórico da conversa de configuração

Resumo cronológico da configuração e da construção da base do projeto (GitHub, Figma, PRD, backlog, Trello, automações, arquitetura, Supabase e documentação). Atualizado em 2026-10-08. **Nenhuma chave, senha ou token é registrado aqui**; os que apareceram em conversas foram omitidos de propósito e devem ser revogados (ver Pendências).

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

## 5. Trello: quadro criado

- **Quadro "FAP Books"** com as 9 listas pedidas (com emoji): 📥 Backlog, 📝 To Do, 🚧 In Progress, 🚫 Blocked, 🔀 Awaiting PR, 🏗️ Awaiting Build, 🔍 Awaiting QA, ❌ QA Rejected, ✅ Done.
- **Como foi criado:** o conector do Trello não estava disponível, então os 80 cards do backlog (com etiquetas e checklists) foram criados pela API REST, com um script. Depois foi instalada a CLI oficial (`trello-cli`, via Homebrew) e autenticada com chave e token próprios. O botão do *CLI Connector* (pareamento por código) não apareceu no quadro, então esse caminho foi descartado.
- **Membros:** os 5 colegas e o dono (Thiago) estão no quadro.
- **Descrições padronizadas:** todos os cards seguem o padrão Objetivo, Problema, Modelo existente, O que fazer, Critério, Relacionadas e Referência técnica, em Markdown. As linhas `Pai:` e `Depende de:` foram preservadas, porque a automação as lê.
- **Numeração:** `[FAP - 0001]` a `[FAP - 0080]` é o backlog do PRD; `0081` a `0160` são as telas; `0161` em diante são configuração, documentação e reuniões. Total atual: 190 cards.

## 6. Automações do Trello

Scripts em `scripts/` e workflows em `.github/workflows/`. Os testes de lógica rodam antes de cada execução (`--selftest`).

| Regra | O que faz |
| -- | -- |
| Dependências | Card em In Progress com `Depende de:` pendente vai para Blocked; ao liberar, sobe para To Do |
| Pai fecha | Card pai vai para Done quando todos os filhos (`Pai:`) estão em Done, em cascata |
| Marcação de pessoas | In Progress marca quem arrastou; Awaiting PR marca o dono e o autor; Awaiting QA marca o Breno; QA Rejected marca o dono e o autor; Done deixa só o autor do PR |
| PR move o card | Branch `FAP/<número>`: PR aberto vai para Awaiting PR; merge vai para Awaiting Build; fechado sem merge volta para In Progress |
| Depois da build | Depois do merge, lint, typecheck e build; se passar, o card vai para Awaiting QA, ou direto para Done se tiver etiqueta de documentação ou configuração |

- **Descoberta importante (2026-10-08):** o agendamento do GitHub (a cada 10 minutos) **nunca disparou**; todas as execuções até então eram manuais. O card `0002` ficou no Backlog com os filhos concluídos por causa disso. Correção (PR #15): as automações rodam também a cada push na `develop` e na `main` e no fim do workflow de PR; o agendamento ficou como reforço.
- **Limite conhecido:** arrastar um card direto no Trello não avisa o GitHub; o pai fecha no próximo PR ou push, ou ao rodar o workflow à mão.
- Os secrets `TRELLO_KEY` e `TRELLO_TOKEN` foram criados no repositório pelo dono. O mapa de usuários GitHub para Trello está em `scripts/usuarios.json`.

## 7. Telas: design e construção

- **17 telas**, cada uma com 3 tipos de card: **Design** (Stitch para Figma), **Blocos** (componentes e partes pequenas, 46 no total) e **Tela** (card pai, fecha sozinho). Total: 80 cards, `0081` a `0160`.
- **Fluxo:** o design vem primeiro; os blocos dependem do frame no Figma e sobem para To Do quando o design fecha.
- **Distribuição por pessoa:** Julia (base visual, layout base, formulário de livro, reserva presencial), Francielio (login, listagem do acervo, fila de aprovação, avisos de prazo), Breno (empréstimo e devolução, multas, painel), Emanuel (pesquisa e detalhe do livro, listagem de usuários, histórico), Igor (cadastro de usuários, solicitar reserva, relatórios). Thiago fica com a configuração.
- **Achado:** a página "UI web" do Figma tinha só um ícone, nenhuma tela desenhada; por isso foram criados os cards de design.
- Os 17 cards de design estão em To Do, começando por `0098` (base visual) e `0101` (layout base).

## 8. Arquitetura

- **Decisão:** começar **só com Next.js + Supabase**. O NestJS foi **adiado**; antes de criar qualquer repositório ou tecnologia nova, perguntar ao responsável.
- **Base:** a mesma estrutura do projeto do professor (`clube-de-livro`): `src/app` e `src/components` (com `index.tsx`), mais `src/services`, `src/types` e `src/lib/supabase`. Cresce em níveis: Nível 1 (sempre), Nível 2 (regras do negócio em `src/domain`, com teste) e Nível 3 (as 6 camadas completas, guardadas em `docs/architecture/futuro/` como caminho de evolução).
- Alias `@/` aponta para `src/`; código em inglês e textos da tela em português.
- **Régua de simplicidade:** antes de adicionar algo novo, perguntar se um colega iniciante explica aquilo em dois minutos.
- **Qualidade:** `npm run lint`, `typecheck` e `build` em todo PR (CI no GitHub). O Vitest está em aberto: sugestão de adotar só na primeira regra do negócio.
- Geradores: `scripts/arch/create-feature-web.sh` (Nível 1), `create-feature-completa.sh` (Nível 3) e `create-migration.sh`.
- Documentos: `docs/architecture/` (índice com decisões, spec e skills do frontend, spec do Supabase, guia do aluno e qualidade).

## 9. Supabase e banco

- **Organização** "FAP Books" (plano gratuito) e projeto **`fap-books`** na região **Brasil (São Paulo)**. Regra do usuário: Supabase sempre na região do Brasil.
- Data API ligada, "expor tabelas automaticamente" desligado e RLS automático ligado (tabela nova só fica acessível com `grant` explícito).
- **5 migrations** em `supabase/migrations/`: perfis e papéis, livros, empréstimos e multas, reservas (comum e pedagógica) e auditoria. Resultado: **8 tabelas**, todas com RLS e policies por perfil. Guia em `docs/database/modelo-de-dados.md`.
- **Testadas** em um Postgres 17 no Docker simulando o Supabase (31 testes de acesso, em `supabase/tests/`) e **aplicadas** no projeto real pelo SQL Editor, conferindo o hash do texto colado com o do Git e depois tabelas, RLS e policies no banco.
- `.env.example` no repositório; o `.env.local` fica só local. A chave secreta do Supabase não é usada.
- `.mcp.json` com o servidor MCP do Supabase do projeto; a autenticação é feita por cada pessoa.
- **Em aberto:** como a funcionária cadastra um aluno novo (criar o login de outra pessoa exige código de servidor com chave secreta).

## 10. Documentação e materiais

- `docs/prd.md`: o PRD v0.3 em Markdown, como **documento base e vivo**, com histórico de mudanças (já registra a decisão de começar só com Next.js e Supabase).
- `docs/onboarding.md` (configuração de ambiente), `docs/tutorial-do-grupo.md` (resumo para o time) e `docs/guias/` (React, Next.js, Tailwind, Supabase, NestJS para estudo futuro e dicas de profissional), com o código dos exemplos compilado.
- `README.md` no estilo do open-gitops/project.
- **Fora do repositório** (pasta `Projeto-IEC`, sem remoto): dois PDFs (roteiro do apresentador, só para o dono, e guia do time) e a skill `mentor-fap-books`, uma mentoria rigorosa por card, inspirada no `guithepc/mentor-prompt`.

## 11. Entregas

- PRs de `#3` a `#15`, todos mergeados. O fluxo é: card, branch `FAP/<número>`, PR para a `develop` e entrega na `main` por PR com bypass do dono.
- **v0.1.0** na `main` (PR #14, 2026-10-08): estrutura `src/`, Supabase, banco, CI, automações do Trello, PRD, arquitetura e guias. Versão do `package.json`: `0.1.0`. Próximas entregas seguem o padrão `v0.2.0` e assim por diante.

## 12. Combinados

- Manter tudo **simples**; perguntar antes de criar pasta, camada, repositório ou tecnologia nova.
- **Sem o nome do Claude** nos commits e PRs novos (só o do dono). Os 12 commits antigos mantêm o `Co-Authored-By`; remover exigiria reescrever o histórico e desativar o ruleset da `main`, e o dono disse que dos antigos não precisa.
- Chave, senha e token nunca no Git, no grupo ou em print.

## 13. Pendências

1. **Reunião:** marcar a apresentação do projeto (`0181`) e a aula de Git e PR (`0179`); os cards estão com prazo em 09/10 e só o dono marcado.
2. **Dar acesso ao Figma** aos 5 colegas e a **Julia aceitar o convite** do repositório.
3. **Todos fazerem o card `0180`** (configuração de ambiente).
4. **Revogar as credenciais** que apareceram em conversas (token e segredo do Trello e token do Figma).
5. Cards novos em To Do: `0185` (dados de teste), `0186` (usuários de teste), `0187` (login e proteção de rotas) e `0188` (deploy, só com autorização do responsável).
6. Cards de design em To Do (17), começando por `0098` e `0101`.
7. `0167`: testar o bloqueio da `main` com um colaborador.
8. Decidir sobre o **Vitest** e sobre o **cadastro de usuários pela funcionária**.
9. Definir a API de **WhatsApp** (`0065`) e a regra de exclusão de livro com empréstimo ativo.
10. Incluir a automação por evento (PR #15) na `main` na próxima entrega, e instalar a skill do mentor, se o time quiser usá-la.
