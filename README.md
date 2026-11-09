<!-- markdownlint-disable MD033 -->
<div align="center">

# FAP Books

**Sistema de gestão e empréstimo de livros da Biblioteca da Faculdade Adventista do Paraná (FAP).**

[![Site](https://img.shields.io/badge/site-online-032B5E?style=for-the-badge)](https://fap-books.vercel.app)
[![Figma](https://img.shields.io/badge/design-Figma-B5121B?style=for-the-badge&logo=figma&logoColor=white)](https://www.figma.com/design/xOr6nlx1EqLMYmSJLh4sHI/FAP-BOOKS---Gestao-para-Biblioteca)
![Status](https://img.shields.io/badge/status-MVP_em_desenvolvimento-0D3B6E?style=for-the-badge)

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-deploy-000000?logo=vercel&logoColor=white)

![Página inicial do FAP Books](docs/images/pagina-inicial.png)

</div>

## Missão

Olá!
O FAP Books digitaliza e centraliza o fluxo que hoje é feito à mão na biblioteca da FAP: cadastro do acervo, cadastro de alunos, professores e funcionários, empréstimos, devoluções, renovações, reservas, prazos e multas.
O produto reúne, em um só lugar, uma área de consulta ao acervo (para alunos e funcionários) e uma área administrativa exclusiva da bibliotecária. O resultado esperado é mais organização do estoque, rastreabilidade de quem está com cada livro e menos erros e atrasos causados pelo controle manual.

## Links

| | |
|---|---|
| Site publicado | https://fap-books.vercel.app (atualizado a cada mudança na `main`) |
| Design no Figma | [FAP BOOKS - Gestão para Biblioteca](https://www.figma.com/design/xOr6nlx1EqLMYmSJLh4sHI/FAP-BOOKS---Gestao-para-Biblioteca) |
| Requisitos do produto | [`docs/prd.md`](docs/prd.md) (PRD v0.3, documento vivo) |
| Fluxo de telas de design | [`docs/design/fluxo-de-telas.md`](docs/design/fluxo-de-telas.md) |

## Estado atual

O projeto está em **MVP em desenvolvimento** (versão `0.8.6`). O que já funciona:

| | Área | O que já existe |
| -- | -- | -- |
| 🏠 | **Página inicial** | Landing pública com apresentação, perfis, recursos, acervo e contato |
| 🔐 | **Login e perfis** | Entrada com Supabase Auth e área própria para aluno, professor e funcionário, com permissões por perfil (RLS em toda tabela) |
| 🔎 | **Pesquisa de livros** | Busca por título, autor, ISBN ou assunto, com filtros de categoria e disponibilidade, para aluno e professor |
| 📚 | **Acervo da bibliotecária** | Listagem com busca e filtros, detalhe do livro, exclusão (com confirmação pelo nome) e inativação de livro com histórico, e importação de livros por planilha `.csv` ou `.xlsx` (com modelo para baixar e erros por linha) |
| 📝 | **Cadastro e edição de livro** | Formulário com validações, gravação segura no banco, upload de capa e aba de importação por planilha |
| 🔄 | **Balcão** | Registro de empréstimo em 5 passos, devolução (com multa de R$ 1,00 por dia de atraso) e renovação até 3 vezes, pelas funções do banco, com limite de 3 livros (4 para formandos) e proteção contra clique duplo |
| 💵 | **Multas** | Lista com filtros e busca, baixa manual do pagamento presencial com autor e data |
| 🧾 | **Histórico** | Empréstimos por usuário e por livro, com filtro por período e situação |
| 👥 | **Usuários** | Listagem com busca e filtros, edição e inativação/reativação; cadastro de aluno, professor e funcionário por convite de e-mail (com a logo da FAP): a pessoa define a própria senha em `/definir-senha` |
| 🗂️ | **Painel da bibliotecária** | Indicadores do dia (emprestados, atrasos, prazos, disponíveis, multas e reservas pendentes), pendências e atalhos, com avisos de prazo e o botão "Avisar no WhatsApp" (mensagem pronta, sem custo) |
| 💬 | **Assistente de ajuda** | Balão para aluno e professor que responde o básico (horário, prazo, multa, renovação, contato) por regras, sem IA, e leva ao WhatsApp da biblioteca quando não sabe |
| 🎓 | **Reserva pedagógica** | Professor solicita livros para a aula (até 30 dias); a funcionária registra no balcão, aprova ou recusa com justificativa, acompanha a fila e a devolução |
| 🎨 | **Design system** | Tokens, tema e componentes base (botão, campo, tabela, modal) usados pelas telas |

Em andamento: área do aluno (meus empréstimos e renovação), aviso de vencimento automático por e-mail, relatórios e a prova de carga; tudo segue no quadro do Trello.

## Módulos

| | Módulo | Descrição |
| -- | -- | -- |
| 📚 | **Acervo** | Cadastro, edição e exclusão de livros; pesquisa por título, autor, categoria ou código; disponibilidade em tempo real |
| 👥 | **Usuários** | Cadastro de alunos, professores e funcionários da biblioteca, com cargo e perfil de acesso |
| 🔄 | **Empréstimos e devoluções** | Empréstimo de até 3 livros por usuário, devolução, renovação e reserva de livros indisponíveis |
| 🎓 | **Reserva pedagógica** | Solicitação antecipada pelo professor, aprovação da bibliotecária e prazo de posse de até 30 dias |
| ⏰ | **Prazos, multas e notificações** | Prazo padrão de 7 dias, multa de R$ 1,00 por dia de atraso com baixa manual e avisos por WhatsApp, e-mail e painel |
| 🧾 | **Histórico e relatórios** | Histórico de empréstimos por usuário e por livro; relatórios de atraso, acervo e reservas |
| 🗂️ | **Painel da bibliotecária** | Área única para operar o dia a dia, incluindo a fila de aprovação de reservas pedagógicas |

Ficam **fora do escopo** por enquanto: venda e compra de livros, controle financeiro geral, gestão de funcionários (RH), integração com outras bibliotecas, biblioteca digital e pagamento online de multa.

## Stack

| | Camada | Tecnologia |
| -- | -- | -- |
| 🖥️ | Frontend | React com [Next.js](https://nextjs.org) e Tailwind CSS |
| ⚙️ | Backend | Server Actions e rotas do Next.js (Node.js), com serviços e regras de domínio em `src/` |
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
npm run lint       # verifica o código
npm test           # roda os testes (vitest)
npm run typecheck  # confere os tipos (TypeScript)
npm run build      # gera a build de produção
npm run start      # serve a build de produção
```

Variáveis de ambiente ficam em um `.env.local` e **nunca** vão para o repositório.

### Banco de dados (Supabase)

O banco e o login ficam no projeto **fap-books** (organização FAP Books, região São Paulo). Passo a passo para rodar o projeto com o banco:

1. Peça acesso à organização **FAP Books** no Supabase a quem é Owner.
2. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (painel: Project Settings → API Keys, chave **publicável**). A chave secreta (`SUPABASE_SERVICE_ROLE_KEY`) só é necessária para o cadastro de usuários e nunca vai ao Git (veja `docs/onboarding.md`).
3. Rode `npm run dev` e entre em [http://localhost:3000/login](http://localhost:3000/login) com um usuário de teste (as senhas são combinadas fora do Git e do chat).
4. O esquema do banco está em `supabase/migrations/` (versionado, com RLS em toda tabela). Para testar mudanças sem tocar no banco real, veja [docs/database/modelo-de-dados.md](docs/database/modelo-de-dados.md).
5. Dados de teste: `supabase/seed.sql` (livros e empréstimos de exemplo). Os usuários de teste são criados em Authentication → Users, no painel.

Mais detalhes: [docs/onboarding.md](docs/onboarding.md).

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
- Todo Pull Request é anexado ao card que cita (branch `FAP/<número>` ou número no título), para o time abrir o PR direto do card.
- Card pai ganha o checklist `Filhos`, com um item por filho; o item é marcado quando o filho vai para `Done`.
- A pessoa que assume, abre o PR ou testa o card é marcada de acordo com a lista.

As automações rodam a cada 10 minutos e precisam dos secrets `TRELLO_KEY` e `TRELLO_TOKEN` no repositório.

## Documentação

| | Documento | Conteúdo |
| -- | -- | -- |
| 🚀 | [`docs/onboarding.md`](docs/onboarding.md) | **Configuração de ambiente:** o que instalar e como rodar o projeto no seu notebook |
| 🧭 | [`docs/architecture/system-design.md`](docs/architecture/system-design.md) | System design: componentes, dados, carga esperada, decisões e plano de crescimento |
| ✅ | [`docs/qa/roteiro-producao.md`](docs/qa/roteiro-producao.md) | Roteiro de QA em produção, por perfil, com o resultado esperado e como deixar o banco limpo |
| 🏛️ | [`docs/arquitetura.md`](docs/arquitetura.md) | Onde fica cada coisa no código, regras de dependência, como criar uma feature e regras do Supabase/RLS |
| 📄 | [`docs/prd.md`](docs/prd.md) | **PRD: documento base do projeto.** É a ideia central, e pode mudar com o tempo; as mudanças ficam registradas no histórico dele |
| 📥 | [`docs/importacao-de-planilha.md`](docs/importacao-de-planilha.md) | Importação de livros por `.csv` ou `.xlsx`: regras, segurança do arquivo e testes |
| ✅ | [`docs/qualidade-de-software.md`](docs/qualidade-de-software.md) | **Regra de qualidade:** código limpo, fácil de entender e seguro, com o checklist de todo PR |
| 🎨 | [`docs/design/README.md`](docs/design/README.md) | Design system: fontes, cores, cantos, ícones e tokens |
| 🗄️ | [`docs/database/`](docs/database) | Modelo de dados, LGPD e backup do banco |
| 🗂️ | [`docs/README.md`](docs/README.md) | Índice de toda a documentação |

O desenho das telas é feito no [Figma](https://www.figma.com/design/xOr6nlx1EqLMYmSJLh4sHI/FAP-BOOKS---Gestao-para-Biblioteca?node-id=2292-11299), página **🖥️ UI web**. Cores, fontes, cantos e ícones estão em [`docs/design/README.md`](docs/design/README.md).

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
