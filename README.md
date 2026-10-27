# FAP Books

<!-- markdownlint-disable MD033 -->
Sistema de gestão e empréstimo de livros da Biblioteca da **Faculdade Adventista do Paraná (FAP)**.

## Missão

Olá!
O FAP Books digitaliza e centraliza o fluxo que hoje é feito à mão na biblioteca da FAP: cadastro do acervo, cadastro de alunos, professores e funcionários, empréstimos, devoluções, renovações, reservas, prazos e multas.
O produto reúne, em um só lugar, uma área de consulta ao acervo (para alunos e funcionários) e uma área administrativa exclusiva da bibliotecária. O resultado esperado é mais organização do estoque, rastreabilidade de quem está com cada livro e menos erros e atrasos causados pelo controle manual.

> Status: **em desenvolvimento** (MVP). O produto é descrito no PRD v0.3, um documento vivo.

## Módulos

| | Módulo | Descrição |
| -- | -- | -- |
| 📚 | **Acervo** | Cadastro, edição e exclusão de livros; pesquisa por título, autor, categoria ou código; disponibilidade em tempo real |
| 👥 | **Usuários** | Cadastro de alunos, professores e funcionários da biblioteca, com cargo e perfil de acesso |
| 🔄 | **Empréstimos e devoluções** | Empréstimo de até 5 livros por usuário, devolução, renovação e reserva de livros indisponíveis |
| 🎓 | **Reserva pedagógica** | Solicitação antecipada pelo professor, aprovação da bibliotecária e prazo de posse de até 30 dias |
| ⏰ | **Prazos, multas e notificações** | Prazo padrão de 7 dias, multa de R$ 1,00 por dia de atraso com baixa manual e avisos por WhatsApp, e-mail e painel |
| 🧾 | **Histórico e relatórios** | Histórico de empréstimos por usuário e por livro; relatórios de atraso, acervo e reservas |
| 🗂️ | **Painel da bibliotecária** | Área única para operar o dia a dia, incluindo a fila de aprovação de reservas pedagógicas |

Ficam **fora do escopo** por enquanto: venda e compra de livros, controle financeiro geral, gestão de funcionários (RH), integração com outras bibliotecas, biblioteca digital e pagamento online de multa.

## Stack

| | Camada | Tecnologia |
| -- | -- | -- |
| 🖥️ | Frontend | React com [Next.js](https://nextjs.org) e Tailwind CSS |
| ⚙️ | Backend | Node.js |
| 🗄️ | Banco de dados | PostgreSQL, via [Supabase](https://supabase.com) |
| 🔐 | Autenticação | Supabase Auth, com permissões por perfil |
| 🐙 | Repositório | GitHub |
| 📋 | Gestão do projeto | Trello |

## Começando

Requisitos: [Node.js](https://nodejs.org) e `npm`.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

Outros comandos:

```bash
npm run lint    # verifica o código
npm run build   # gera a build de produção
npm run start   # serve a build de produção
```

Variáveis de ambiente ficam em um `.env` local e **nunca** vão para o repositório.

## Fluxo de trabalho

O desenvolvimento acontece na branch `develop`. A `main` é protegida: só recebe código por Pull Request.

1. Cada tarefa é um card do Trello, com título no formato `[FAP - 0001] - o que é`.
2. Crie a branch a partir da `develop` com o número do card: `FAP/<número>` (por exemplo, `FAP/0003`).
3. Use commits no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br): `feat:`, `fix:`, `docs:`, `chore:`, `ci:`.
4. Abra o Pull Request para a `develop`.

As listas do quadro seguem o ciclo da tarefa:

`📥 Backlog` → `📝 To Do` → `🚧 In Progress` → `🔀 Awaiting PR` → `🏗️ Awaiting Build` → `🔍 Awaiting QA` → `✅ Done` (ou `❌ QA Rejected` e `🚫 Blocked`)

### Automações do Trello

Os scripts em [`scripts/`](scripts) e os workflows em [`.github/workflows/`](.github/workflows) mantêm o quadro em dia:

- Pull Request aberto, mergeado ou fechado move o card da branch `FAP/<número>`.
- Card em `In Progress` com dependência pendente volta para `Blocked`, e sobe para `To Do` quando a dependência termina.
- Card pai vai para `Done` quando todos os filhos terminam.
- A pessoa que assume, abre o PR ou testa o card é marcada de acordo com a lista.

As automações rodam a cada 10 minutos e precisam dos secrets `TRELLO_KEY` e `TRELLO_TOKEN` no repositório.

## Documentação

| | Documento | Conteúdo |
| -- | -- | -- |
| 🚀 | [`docs/onboarding.md`](docs/onboarding.md) | **Configuração de ambiente:** o que instalar e como rodar o projeto no seu notebook |
| 📘 | [`docs/tutorial-do-grupo.md`](docs/tutorial-do-grupo.md) | Resumo para o grupo: onde está cada coisa e como trabalhar |
| 📚 | [`docs/guias/`](docs/guias/README.md) | Guias de estudo: React, Next.js, Tailwind, Supabase e NestJS, com código explicado e dicas |
| 📄 | [`docs/prd.md`](docs/prd.md) | **PRD: documento base do projeto.** É a ideia central, e pode mudar com o tempo; as mudanças ficam registradas no histórico dele |
| 🗺️ | [`docs/backlog/epicos-features-historias.md`](docs/backlog/epicos-features-historias.md) | Backlog completo: 8 épicos, 25 features e 47 histórias, com critérios de aceite |
| 🧩 | [`docs/backlog/design-telas.json`](docs/backlog/design-telas.json) | Cards de design e de construção de cada tela |
| 🧭 | [`docs/historico-conversa.md`](docs/historico-conversa.md) | Histórico da configuração inicial do projeto |

O desenho das telas é feito no [Figma](https://www.figma.com/design/xOr6nlx1EqLMYmSJLh4sHI/FAP-BOOKS---Gestao-para-Biblioteca?node-id=2292-11299), página **🖥️ UI web**.

## Identidade visual

Livro aberto estilizado com a letra "A", em tom navy.

| Cor | Uso |
| -- | -- |
| `#032B5E` | Navy principal |
| `#0D3B6E` | Superfícies e destaques |
| `#FFFFFF` | Fundo e texto sobre navy |
| `#8C8C8C` | Texto secundário e bordas |

## Equipe

Francielio Souza, Thiago Dutra, Julia Wassão, Igor Santana, Breno Gruber e Emanuel do Santos.

## Contribuindo

O projeto é desenvolvido pela equipe acima. Antes de abrir um Pull Request, leia a seção [Fluxo de trabalho](#fluxo-de-trabalho): branch no padrão `FAP/<número>`, commits no padrão Conventional Commits e PR para a `develop`.

## Segurança

O sistema trata dados de alunos e funcionários e deve seguir a LGPD. Encontrou uma vulnerabilidade? **Não abra uma issue pública.** Fale diretamente com o mantenedor, [@dutrathiagodev](https://github.com/dutrathiagodev).

## Suporte

Dúvidas sobre o projeto ou sobre uma tarefa: procure o card no quadro do Trello **FAP Books** ou fale com a equipe.
