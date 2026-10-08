# FAP Books — o que já está pronto e como trabalhar

Resumo para o grupo. Leva uns 10 minutos de leitura. Guarde este arquivo: ele diz **onde está cada coisa** e **qual é o seu próximo passo**.

## 1. O projeto em duas linhas

O FAP Books é o sistema da biblioteca da FAP: cadastro de livros e usuários, empréstimos, devoluções, reservas, multas e relatórios. A ideia central está no [PRD](prd.md), que é o documento base. Ele pode mudar com o tempo, e toda mudança fica registrada no histórico dele.

## 2. Onde está cada coisa

| O quê | Onde | Para quê |
| -- | -- | -- |
| **Código** | GitHub: `dutrathiagodev/fap-books` | Guarda o projeto e o histórico |
| **Tarefas** | Trello: quadro **FAP Books** | Cada tarefa é um card `[FAP - 0001]` |
| **Telas** | Figma: **FAP BOOKS - Gestão para Biblioteca** | O design das telas |
| **Banco e login** | Supabase: projeto `fap-books` (São Paulo) | Dados, usuários e arquivos |
| **Documentos** | pasta `docs/` do repositório | PRD, arquitetura, guias |

## 3. Como o trabalho funciona

```text
Card no Trello  →  branch FAP/<número>  →  commits  →  Pull Request para a develop  →  revisão  →  merge
```

- O código novo vai sempre para a branch **`develop`**, por Pull Request. A **`main`** é protegida e só recebe código por PR, feito pelo responsável.
- O nome da branch é `FAP/` + o número do card. Exemplo: card `[FAP - 0003]` → branch `FAP/0003`.
- Mensagens de commit começam com `feat:`, `fix:`, `docs:`, `chore:` ou `ci:`.

### O que o Trello faz sozinho

As listas seguem a vida da tarefa:

`📥 Backlog` → `📝 To Do` → `🚧 In Progress` → `🔀 Awaiting PR` → `🏗️ Awaiting Build` → `🔍 Awaiting QA` → `✅ Done` (ou `❌ QA Rejected` e `🚫 Blocked`)

| Quando você… | O Trello… |
| -- | -- |
| arrasta um card para **In Progress** | te marca como responsável. Se faltar uma dependência, o card vai para **Blocked** |
| abre um PR em `FAP/<número>` | move o card para **Awaiting PR** |
| o PR é mergeado | move para **Awaiting Build** |
| o card chega em **Awaiting QA** | marca o Breno para testar |
| todos os filhos de um card terminam | o card pai vai para **Done** |

Isso roda por automações a cada 10 minutos: pode levar um pouco para o card se mexer.

## 4. A estrutura do código

É a mesma do projeto do professor (`app` e `components`), com mais três pastas.

```text
src/
  app/            as rotas (uma pasta por endereço)
  components/     os pedaços de tela, um arquivo por componente
  services/       funções que buscam e salvam dados
  types/          o formato dos dados
  lib/supabase/   a ligação com o Supabase
```

A regra principal: **a tela pede dados ao `service`, e só o `service` fala com o Supabase.** Detalhes e exemplos no [Guia do aluno](architecture/guia-do-aluno.md).

Para criar uma feature nova:

```bash
scripts/arch/create-feature-web.sh books Book
scripts/arch/create-migration.sh create_books_table
```

## 5. O banco de dados

- Toda mudança no banco é um arquivo em `supabase/migrations/`, guardado no Git.
- **Toda tabela tem RLS** (a regra que decide quem vê o quê).
- Ninguém mexe no banco só clicando no painel.

Passo a passo em [supabase.spec.md](architecture/supabase.spec.md).

## 6. Qualidade

Antes de abrir um PR, rode:

```bash
npm run lint
npm run typecheck
npm run build
```

O mesmo roda sozinho no GitHub em todo PR (o CI). Se ficar vermelho, leia a mensagem e corrija. Guia completo: [qualidade.md](architecture/qualidade.md).

## 7. Seu primeiro passo: configurar o notebook

Siga o [guia de configuração de ambiente](onboarding.md) e o card **Configuração de ambiente** do Trello. Resumo:

1. Instale **Node.js 22**, **Git** e **VS Code**.
2. Aceite os convites do **GitHub**, **Trello**, **Figma** e **Supabase**.
3. `git clone https://github.com/dutrathiagodev/fap-books.git` e depois `cd fap-books`, `git switch develop` e `npm install`.
4. Copie `.env.example` para `.env.local` e preencha a chave pública que está no card do Trello.
5. `npm run dev` e abra http://localhost:3000.
6. Marque seu nome no checklist **Quem já terminou** do card.

## 8. As telas: quem faz o quê

Cada tela tem 3 tipos de card, na ordem:

1. **Design: … (Stitch → Figma):** crie o design no Stitch, exporte para o Figma, ajuste e guarde o link do frame no card.
2. **Bloco: …:** quando o design fecha, os blocos sobem para To Do. Cada bloco é um componente ou parte pequena da tela, construído a partir do Figma.
3. **Tela: …:** o card "pai". Fecha sozinho quando o design e todos os blocos terminam.

| Pessoa | Telas |
| -- | -- |
| **Julia** | Base visual, Layout base, Formulário de livro, Reserva presencial |
| **Francielio** | Login, Listagem do acervo, Fila de aprovação, Avisos de prazo |
| **Breno** | Empréstimo e devolução, Multas, Painel da bibliotecária |
| **Emanuel** | Pesquisa e detalhe do livro, Listagem de usuários, Histórico |
| **Igor** | Cadastro de usuários, Solicitar reserva, Relatórios |
| **Thiago** | Configuração do projeto (GitHub, Supabase, CI, banco) |

O design vem **primeiro**: comece pelo card de design da sua tela. Os de **Base visual** e **Layout base** são os primeiros, porque as outras telas reaproveitam as cores e o menu. A paleta é navy `#032B5E` e `#0D3B6E`, branco `#FFFFFF` e cinza `#8C8C8C`.

## 9. Combinados do time

- **Perguntar antes** de criar um repositório, uma pasta ou uma tecnologia nova.
- **Passo pequeno:** um PR pequeno e entendido por todos vale mais que um grande.
- **Chave, senha e token nunca vão para o Git**, nem para o grupo. Se escapar, avise na hora.
- **Dúvida é sempre bem-vinda.** Anote o que tentou e a mensagem de erro, e pergunte.

## 10. Quer saber mais?

| Assunto | Leia |
| -- | -- |
| Entender a arquitetura do zero | [Guia do aluno](architecture/guia-do-aluno.md) |
| Regras do frontend | [frontend.spec.md](architecture/frontend.spec.md) |
| Banco de dados | [supabase.spec.md](architecture/supabase.spec.md) |
| Como fazer um bom PR | [qualidade.md](architecture/qualidade.md) |
| Decisões do projeto | [architecture/README.md](architecture/README.md) |
| O que o produto deve fazer | [prd.md](prd.md) |
