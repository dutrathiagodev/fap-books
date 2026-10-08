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
| **Camada** | Um grupo de arquivos com um único tipo de responsabilidade | `domain`, `data`, `infra`… |
| **Entidade** | O "molde" de uma coisa do negócio | Um `Book` com título e autor |
| **Caso de uso** | Uma ação que o usuário faz | "Listar livros", "Registrar empréstimo" |
| **Repositório** | O "contrato" de como buscar e salvar uma entidade | `BooksRepository` |
| **Adaptador** | O código que fala de verdade com o mundo de fora | Falar com o Supabase |
| **Mapper** | Converte o formato do banco para o formato do sistema | `due_date` → `dueDate` |
| **Page** | O componente que decide o que mostrar na tela | Carregando, erro, vazio ou lista |
| **View** | O componente que só desenha o caso de sucesso | A lista de livros |
| **Server Action** | Uma função que o site executa no servidor | Salvar um empréstimo |
| **Banco de dados** | Onde os dados ficam guardados, em tabelas | Tabela `books` |
| **Tabela / linha / coluna** | Uma planilha: cada linha é um registro | Uma linha por livro |
| **Migration** | Um arquivo que descreve uma mudança no banco | "Criar a tabela `books`" |
| **RLS** | Regra do banco que filtra quem vê qual linha | Aluno só vê os próprios empréstimos |
| **Policy** | Uma regra específica de RLS | "Só a bibliotecária cria livro" |
| **Chave (key)** | Uma senha que o sistema usa para falar com o Supabase | Nunca vai para o Git |

## 4. As camadas, uma por uma

Cada feature (livros, usuários, empréstimos…) tem as mesmas pastas. Quem aprende uma, aprende todas.

**`domain` — o regulamento.** Aqui moram as entidades, os contratos e os casos de uso. É código TypeScript simples, que não sabe que React, Next ou Supabase existem. Exemplo: "um usuário não pode ter mais de 5 livros".

**`data` — quem busca e salva.** Cumpre o contrato do domain. Recebe o adaptador, pede os dados e usa o mapper para entregar entidades prontas.

**`infra` — os fios para fora.** O cliente do Supabase e os adaptadores. Só aqui o código sabe qual banco existe de verdade.

**`presenter` — o estado da tela.** Hooks e Server Actions que chamam os casos de uso e devolvem o resultado para a tela.

**`modules` — o que aparece.** A **page** decide o cenário, e a **view** desenha o sucesso. Também ficam aqui os **widgets**, pequenos pedaços de tela reutilizáveis.

**`main/di` — a montagem.** Uma função como `makeListBooks()` junta as peças de uma feature. É o único lugar que conhece todo mundo.

**`app` — as rotas.** São os endereços do site. Cada arquivo é curto e só chama a page do módulo.

### A regra que protege você

> Quem está mais perto da tela pode usar quem está mais perto do banco, **nunca o contrário**.

```text
app → modules → presenter → domain
data → domain
infra → data
```

Se você precisar importar algo "para trás", é sinal de que o código está na camada errada. Pare e pergunte antes de seguir.

## 5. O caminho de uma tela: "lista de livros"

1. A pessoa abre `/livros`.
2. `src/app/livros/page.tsx` (curto) chama `BooksPage`.
3. `BooksPage` mostra o carregando enquanto busca os dados.
4. Ela chama `makeListBooks()` (em `main/di`), que monta o caso de uso.
5. O caso de uso `ListBooksUseCase` pede ao **contrato** `BooksRepository` a lista.
6. `BooksRepositoryImpl` (em `data`) cumpre o contrato e usa o **adaptador**.
7. O adaptador (em `infra`) pergunta ao **Supabase**.
8. O Supabase aplica o **RLS** (só devolve o que a pessoa pode ver) e responde.
9. O mapper converte as linhas em entidades `Book`.
10. A page escolhe: lista vazia → `BooksEmptyView`; sucesso → `BooksView`. Se deu erro, o Next mostra `error.tsx`.

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
3. **Gerar a base.** `scripts/arch/create-feature-web.sh categories` cria todas as pastas e arquivos de exemplo.
4. **Trocar os exemplos** pelos nomes reais, começando pelo `domain`.
5. **Banco.** `scripts/arch/create-migration.sh create_categories_table`, escrever o SQL com RLS e conferir.
6. **Testar.** Escreva o teste da regra e rode `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`.
7. **Commit** no padrão: `feat: adiciona categorias`.
8. **PR** para a `develop`, com descrição clara. O card vai sozinho para Awaiting PR.

## 8. Erros comuns e como resolver

| Sintoma | Causa provável | O que fazer |
| -- | -- | -- |
| A lista volta vazia mesmo com dados | RLS sem policy de leitura, ou sem `grant` | Confira a migration: `grant select` e a policy de `select` |
| "permission denied for table" | Faltou `grant` na migration | Adicione `grant ... to authenticated` em uma migration nova |
| Erro de import circular | Importou uma camada "para trás" | Reveja a regra da seção 4 e mova o código |
| `Module not found: @/...` | Caminho ou alias errado | Confira se o arquivo existe em `src/` |
| Texto aparece só depois de piscar | Busca de dados dentro do componente do navegador | Busque no servidor, na page |
| A chave apareceu no Git | `.env` commitado | Avise o time na hora: a chave precisa ser trocada |

## 9. Como pedir ajuda

1. Anote o que você queria fazer, o que aconteceu e a mensagem de erro completa.
2. Procure no Trello e neste guia.
3. Pergunte ao time, **antes** de inventar uma solução nova. Não existe pergunta boba.

## 10. Combinados do time

- **Perguntar antes** de criar um repositório novo ou adotar uma tecnologia nova.
- **Passo pequeno.** Prefira um PR pequeno e entendido por todos a um PR grande.
- **Qualidade primeiro:** consulte [qualidade.md](qualidade.md).
- **Segredo nunca no Git.** Chaves ficam no `.env.local` e nos secrets.
