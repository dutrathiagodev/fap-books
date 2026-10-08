# Configuração de ambiente

Guia para deixar o **seu notebook** pronto para trabalhar no FAP Books. Leva uns 30 minutos. Faça na ordem. Se travar em algum passo, anote a mensagem de erro e chame o time: ninguém aqui sabe tudo, e todo mundo já travou nesses passos.

## 1. O que baixar e instalar

| O quê | Para quê | Onde baixar |
| -- | -- | -- |
| **Node.js 22 (LTS)** | Roda o projeto e instala as bibliotecas (já inclui o `npm`) | https://nodejs.org |
| **Git** | Guarda o histórico do código e conversa com o GitHub | https://git-scm.com/downloads |
| **VS Code** | O editor de código | https://code.visualstudio.com |

Extensões do VS Code (aba de extensões, `Ctrl+Shift+X`):

- **ESLint** (avisa de erros no código)
- **Tailwind CSS IntelliSense** (sugere as classes de estilo)

Opcional: **GitHub CLI** (`gh`), que ajuda a abrir PRs pelo terminal: https://cli.github.com

Para conferir, abra um terminal e rode:

```bash
node -v    # deve mostrar v22 ou mais novo
npm -v
git --version
```

> Usa Windows? Instale o Node.js e o Git pelos instaladores do site e use o terminal do próprio VS Code (menu Terminal → Novo Terminal).

## 2. Contas e acessos

Você precisa de conta e acesso em quatro lugares. O Thiago manda os convites; **aceite todos**.

| Onde | Para quê | Como entrar |
| -- | -- | -- |
| **GitHub** | Código, branches e Pull Requests | Crie a conta em github.com e aceite o convite do repositório `fap-books` (chega por e-mail) |
| **Trello** | Cards e tarefas | Aceite o convite do quadro **FAP Books** |
| **Figma** | Telas e design | Aceite o convite do arquivo **FAP BOOKS - Gestão para Biblioteca** (com permissão de edição) |
| **Supabase** | Banco de dados e login | Aceite o convite da organização **FAP Books** (só leitura é suficiente no começo) |

Dica: use o mesmo e-mail nos quatro lugares.

## 3. Configurar o Git (uma vez só)

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email-do-github@exemplo.com"
```

Depois entre na sua conta do GitHub pelo terminal. Com o GitHub CLI: `gh auth login`. Sem ele, o Git pede o login na primeira vez que você enviar código.

## 4. Baixar o projeto

```bash
git clone https://github.com/dutrathiagodev/fap-books.git
cd fap-books
git switch develop
npm install
```

O `npm install` baixa as bibliotecas (pasta `node_modules`) e pode levar alguns minutos.

## 5. Criar o arquivo `.env.local`

O `.env.local` guarda as chaves do projeto e **nunca vai para o Git**.

1. Copie o modelo:
   ```bash
   cp .env.example .env.local
   ```
   No Windows (PowerShell): `Copy-Item .env.example .env.local`
2. Abra o `.env.local` no VS Code e preencha o `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a **chave pública**. Ela está no card **Configuração de ambiente** do Trello (o quadro é privado para a equipe).
3. Deixe `SUPABASE_SERVICE_ROLE_KEY` **em branco**. Essa é a chave secreta e fica só com quem mexe no banco.

> **Regra de ouro:** chave, senha e token nunca vão para o Git, nem em mensagem, print ou e-mail. Se aparecer um por engano, avise o time na hora.

## 6. Rodar o projeto

```bash
npm run dev
```

Abra http://localhost:3000. Se a página abriu, o ambiente está pronto. Para parar, `Ctrl+C` no terminal.

## 7. Conferir que tudo funciona

```bash
npm run lint
npm run typecheck
npm run build
```

Os três devem terminar sem erro. É o mesmo que o CI faz em todo Pull Request.

## 8. Seu primeiro dia

1. Leia o [Guia do aluno](architecture/guia-do-aluno.md).
2. Veja o card que está com você no Trello.
3. Antes de começar, crie a branch com o número do card:
   ```bash
   git switch develop
   git pull
   git switch -c FAP/<número-do-card>
   ```
4. Ao terminar, siga o [Guia de qualidade](architecture/qualidade.md) e abra o PR para a `develop`.

## Problemas comuns

| Sintoma | O que fazer |
| -- | -- |
| `node` ou `npm` "não é reconhecido" | Feche e abra o terminal depois de instalar. Se persistir, reinstale o Node.js |
| `npm install` dá erro de permissão | Não use `sudo`. Confira se você está dentro da pasta `fap-books` |
| "Faltam as variáveis do Supabase" | Falta o `.env.local` (passo 5). Confira o nome do arquivo e o conteúdo |
| `git clone` pede senha e recusa | Entre na conta com `gh auth login`, ou use um token pessoal do GitHub |
| A porta 3000 está ocupada | Feche o outro `npm run dev` ou rode `npm run dev -- -p 3001` |
| Não consigo abrir o Figma ou o Trello | O convite ainda não foi aceito. Procure no e-mail e na caixa de spam |

## Checklist final

- [ ] Node.js 22, Git e VS Code instalados
- [ ] Contas e convites aceitos (GitHub, Trello, Figma e Supabase)
- [ ] Git configurado com nome e e-mail
- [ ] Projeto clonado e `npm install` feito
- [ ] `.env.local` criado e preenchido
- [ ] `npm run dev` abre em http://localhost:3000
- [ ] `npm run lint`, `typecheck` e `build` sem erro
