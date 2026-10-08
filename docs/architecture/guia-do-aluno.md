# Guia do aluno — a arquitetura do FAP Books explicada do zero

Este guia é para quem está começando. Você **não precisa** saber backend nem banco de dados para ler. Cada termo novo é explicado quando aparece. Se alguma parte ainda ficar confusa, avise o time: o guia deve melhorar, e a dúvida é sempre válida.

## 1. A ideia em uma imagem

Pense em uma biblioteca de verdade:

- **O balcão** é o que a pessoa vê e toca. No sistema, são as **telas**.
- **O regulamento** diz que cada aluno leva até 5 livros por 7 dias. No sistema, são as **regras do negócio**.
- **O arquivo** guarda as fichas dos livros. No sistema, é o **banco de dados**.
- **O segurança** só deixa entrar quem pode. No sistema, é o **login e as permissões**.

Arquitetura é a forma de organizar o código para cada uma dessas coisas ficar em um lugar só. Assim, quando o regulamento mudar (por exemplo, de 5 para 3 livros), você sabe exatamente em qual arquivo mexer, e nada na tela quebra.

## 2. As peças do projeto

```text
  Navegador          Next.js (o site)               Supabase
 ┌──────────┐      ┌───────────────────┐       ┌──────────────────┐
 │  telas   │ ───▶ │ telas + regras do │ ────▶ │ banco, login e   │
 │ da pessoa│      │ servidor          │       │ arquivos         │
 └──────────┘      └───────────────────┘       └──────────────────┘
```

- **Next.js** é o framework do site. Ele desenha as telas e também tem uma parte que roda no **servidor** (um computador na internet, não o do usuário).
- **Supabase** guarda os dados e cuida do login.
- **Hoje não existe uma terceira peça** (uma API separada). Isso é de propósito: menos peças, menos coisas para aprender de uma vez.

## 3. Glossário rápido

| Termo | O que é, em uma frase | Exemplo no FAP Books |
| -- | -- | -- |
| **Rota** | Um endereço do site, feito por uma pasta em `src/app` | `/books` |
| **Componente** | Um pedaço de tela reutilizável, um arquivo em `src/components` | `Button`, `BooksList` |
| **Props** | Os dados que um componente recebe de fora | `items={books}` |
| **Service** | Um arquivo de funções que busca e salva dados | `listBooks()` |
| **Type** | A descrição do formato de um dado | `Book` com `id` e `name` |
| **Server Component** | Componente que roda no servidor e já chega pronto | A página `/books` |
| **`"use client"`** | Marca um componente que roda no navegador (tem `useState`, clique ou formulário) | O formulário de login |
| **Regra do negócio** | Uma regra que vem do regulamento da biblioteca | Máximo de 5 livros |
| **Banco de dados** | Onde os dados ficam guardados, em tabelas | Tabela `books` |
| **Tabela / linha / coluna** | Uma planilha: cada linha é um registro | Uma linha por livro |
| **Migration** | Um arquivo que descreve uma mudança no banco | "Criar a tabela `books`" |
| **RLS** | Regra do banco que filtra quem vê qual linha | Aluno só vê os próprios empréstimos |
| **Policy** | Uma regra específica de RLS | "Só a bibliotecária cria livro" |
| **Chave (key)** | Uma senha que o sistema usa para falar com o Supabase | Nunca vai para o Git |

## 4. A estrutura do projeto

É a **mesma estrutura do projeto do professor** (`app` e `components`), com mais três pastas pequenas.

```text
src/
  app/          as rotas: uma pasta por endereço do site
  components/   os pedaços de tela, um arquivo por componente
  services/     as funções que buscam e salvam dados
  types/        a descrição do formato dos dados
  lib/supabase/ a ligação com o Supabase
```

**`app` — as rotas.** Cada pasta é um endereço. `src/app/books/page.tsx` é a tela de `/books`. Ao lado dela ficam o `loading.tsx` (carregando) e o `error.tsx` (deu erro).

**`components` — o que se vê.** Um arquivo por componente, com as props descritas em uma `interface`, e todos reexportados no `index.tsx`. Componente só desenha: **não busca dados**.

**`services` — quem busca e salva.** Funções como `listBooks()`. É o único lugar que conversa com o Supabase.

**`types` — os formatos.** `Book`, `Loan`, `User`. O TypeScript avisa quando você erra um nome de campo.

**`lib/supabase` — a ligação.** Cria o cliente do Supabase para o navegador e para o servidor.

### A regra que protege você

> A tela pede dados ao **service**, e **só o service** fala com o Supabase.

Se você escreveu `supabase.from(...)` dentro de um componente ou de uma página, está no lugar errado. Mova para um service.

### Quando aparecer uma regra do negócio

Regras como "máximo de 5 livros" ou "multa de R$ 1,00 por dia" vão para funções simples em `src/domain/<feature>/`, com teste. É o **Nível 2** da arquitetura ([frontend.spec.md](frontend.spec.md)). Só crie essa pasta quando a primeira regra aparecer. E se um dia o time quiser mais camadas, existe o caminho descrito em [futuro/camadas-completas.md](futuro/camadas-completas.md).

## 5. O caminho de uma tela: "lista de livros"

1. A pessoa abre `/books`.
2. O Next.js mostra o `loading.tsx` enquanto prepara a página.
3. `src/app/books/page.tsx` roda no servidor e chama `listBooks()`.
4. `listBooks()` (em `services`) pede os livros ao **Supabase**.
5. O Supabase aplica o **RLS** (só devolve o que a pessoa pode ver) e responde.
6. A página decide: lista vazia → "Nada por aqui ainda."; com livros → `BooksList`.
7. `BooksList` desenha a lista recebendo `items` por props.
8. Se algo deu errado em qualquer passo, o Next.js mostra o `error.tsx`.

Cada passo é um arquivo pequeno com uma tarefa só. É assim que o sistema cresce sem virar bagunça.

## 6. Banco de dados para quem nunca viu

- Um banco é como uma planilha organizada. Cada **tabela** é uma aba (`books`, `loans`). Cada **linha** é um registro. Cada **coluna** é um campo (`title`, `author`).
- Tabelas se ligam por **chaves estrangeiras**: o empréstimo guarda o `book_id` do livro emprestado.
- Para mudar o banco usamos **migrations**: arquivos SQL guardados no Git. Assim todo mundo tem o mesmo banco e o histórico fica registrado.
- **Nunca** mude o banco só clicando no painel do Supabase. Se mudar, o resto do time não recebe a mudança.
- **RLS** protege cada linha. Toda tabela nova precisa dele, sem exceção. O passo a passo está em [supabase.spec.md](supabase.spec.md).

## 7. Passo a passo de uma feature nova

Vamos supor a feature "categorias".

1. **Card.** Pegue o card no Trello e mova para In Progress. Isso marca você como responsável.
2. **Branch.** `git switch develop`, `git pull` e `git switch -c FAP/<número-do-card>`.
3. **Gerar a base.** `scripts/arch/create-feature-web.sh categories Category` cria o tipo, o service, o componente e a rota.
4. **Trocar os exemplos** pelos nomes reais, começando por `src/types`.
5. **Banco.** `scripts/arch/create-migration.sh create_categories_table`, escrever o SQL com RLS e conferir.
6. **Verificar.** `npm run lint`, `npm run typecheck` e `npm run build`. Se houver regra do negócio, escreva o teste dela.
7. **Commit** no padrão: `feat: adiciona categorias`.
8. **PR** para a `develop`, com descrição clara. O card vai sozinho para Awaiting PR.

## 8. Erros comuns e como resolver

| Sintoma | Causa provável | O que fazer |
| -- | -- | -- |
| A lista volta vazia mesmo com dados | RLS sem policy de leitura, ou sem `grant` | Confira a migration: `grant select` e a policy de `select` |
| "permission denied for table" | Faltou `grant` na migration | Adicione `grant ... to authenticated` em uma migration nova |
| Erro de import circular | Dois arquivos se importam | Mova o que é comum para um terceiro arquivo (por exemplo, em `types`) |
| `Module not found: @/...` | Caminho errado. `@/` aponta para `src/` | Confira se o arquivo existe em `src/` (`@/components` é `src/components`) |
| Texto aparece só depois de piscar | Busca de dados dentro de um componente com `"use client"` | Busque no servidor, na página, e passe por props |
| A chave apareceu no Git | `.env` commitado | Avise o time na hora: a chave precisa ser trocada |

## 9. Como pedir ajuda

1. Anote o que você queria fazer, o que aconteceu e a mensagem de erro completa.
2. Procure no Trello e neste guia.
3. Pergunte ao time, **antes** de inventar uma solução nova. Não existe pergunta boba.

## 10. Combinados do time

- **Perguntar antes** de criar um repositório, uma pasta nova ou uma tecnologia nova.
- **Passo pequeno.** Prefira um PR pequeno e entendido por todos a um PR grande.
- **Qualidade primeiro:** consulte [qualidade.md](qualidade.md).
- **Segredo nunca no Git.** Chaves ficam no `.env.local` e nos secrets.
