# Frontend Spec — Next.js + Supabase com Clean Architecture

Documento normativo: define como toda feature do FAP Books é organizada. Se você está começando, leia primeiro o [Guia do aluno](guia-do-aluno.md).

Modelo de referência: `feature.spec.md` do projeto Flutter white_label_barber, adaptado para Next.js (App Router), React, TypeScript e Supabase.

## Escopo

Nesta fase o projeto tem **duas peças**: o site (Next.js) e o Supabase (banco, login e arquivos). Não existe API separada. O código de servidor do Next.js (Server Components e Server Actions) conversa com o Supabase. O NestJS foi adiado; se entrar no futuro, será por decisão do time (ver [README](README.md)).

O banco e a segurança dele estão em [supabase.spec.md](supabase.spec.md).

## Camadas obrigatórias

Cada feature usa estas camadas, dentro de `src/`. Em palavras simples:

| Camada | Pasta | Em palavras simples |
| -- | -- | -- |
| domain | `src/domain/<feature>/` | **O que o sistema é e quais são as regras.** Um livro, um empréstimo, o limite de 5 livros. Não sabe que existem React, Next ou banco |
| data | `src/data/<feature>/` | **Como trazer e levar dados.** Implementa o que o domain pede e converte o formato do banco para o formato do sistema |
| infra | `src/infra/` | **Os fios que ligam ao mundo de fora.** Cliente do Supabase (login, banco, arquivos) |
| presenter | `src/presenter/<feature>/` | **O estado da tela.** Hooks e Server Actions que chamam os casos de uso |
| modules | `src/modules/<feature>/` | **O que aparece na tela.** Page, views e widgets |
| main | `src/main/di/` | **A montagem.** Junta as peças de cada feature |
| app | `src/app/` | **As rotas do site.** Arquivos curtos que só chamam a page do módulo |

## Fluxo de dependência (sempre nesta direção)

```text
app → modules → presenter → domain
data → domain
infra → data
main/di → todas (somente para montagem)
```

Regra de ouro: **quem está à esquerda pode usar quem está à direita, nunca o contrário.** O `domain` não importa nada de React, Next.js, Supabase nem `fetch`. É TypeScript puro.

## Estrutura obrigatória por feature

```text
src/
  app/<rota>/page.tsx                  # curto: chama modules/<feature>/page
  app/<rota>/loading.tsx               # tela de carregamento da rota
  app/<rota>/error.tsx                 # tela de erro da rota
  domain/<feature>/
    entities/<feature>.entity.ts
    repositories/<feature>.repository.ts   # o "contrato": o que precisa existir
    usecases/<verbo>-<feature>.usecase.ts  # uma ação do usuário
  data/<feature>/
    models/<feature>.model.ts              # formato que vem do banco
    mappers/<feature>.mapper.ts            # model → entity
    repositories/<feature>.repository-impl.ts
  infra/
    supabase/browser-client.ts             # sessão no navegador
    supabase/server-client.ts              # sessão no servidor
    adapters/<feature>/<feature>-supabase.adapter.ts
  presenter/<feature>/
    <feature>.state.ts
    use-<feature>.ts                       # hook (Client Component)
    <feature>.actions.ts                   # Server Actions (escrita)
  modules/<feature>/
    page/<feature>-page.tsx                # decide qual cenário mostrar
    page/view/<feature>-view.tsx           # cenário de sucesso
    page/view/<feature>-loading-view.tsx
    page/view/<feature>-error-view.tsx
    page/view/<feature>-empty-view.tsx
    widgets/                               # pedaços reutilizáveis
  main/di/
    <feature>.dependencies.ts              # funções que montam a feature
```

## Regras

1. **A rota é curta.** `app/<rota>/page.tsx` só importa e devolve a page do módulo.
2. **A page decide o cenário.** Carregando, erro, vazio ou sucesso. Em Server Component, ela usa `<Suspense>` para o carregando; o erro vai para `error.tsx`; lista vazia mostra a `EmptyView`.
3. **A view só mostra o sucesso.** Recebe tudo por props. Não busca dados e não decide cenário.
4. **`"use client"` só onde há interação.** Formulário, clique e estado local. O resto roda no servidor.
5. **O domain define contratos.** O caso de uso depende de uma interface (`<feature>.repository.ts`), nunca de `fetch` ou do Supabase.
6. **O data cumpre o contrato.** O `repository-impl` usa o adaptador da `infra` e o mapper para devolver entidades.
7. **Montagem por funções simples.** `main/di/<feature>.dependencies.ts` exporta funções como `makeListBooks()`. Elas criam o adaptador, o repositório e o caso de uso e devolvem o caso de uso pronto. Sem biblioteca de injeção. Se um dia for preciso algo mais forte, só esse arquivo muda.
8. **As regras do negócio ficam no domain.** Limite de 5 livros, prazo de 7 dias, multa de R$ 1,00 por dia. Elas rodam no servidor, dentro dos casos de uso chamados pelas Server Actions.
9. **Segurança em duas barreiras.** (1) O servidor checa o perfil do usuário antes de executar o caso de uso. (2) O **RLS do Supabase** impede que o banco entregue dados a quem não pode. Como não há API entre o site e o banco, o RLS é obrigatório em toda tabela.
10. **Login.** A sessão é do Supabase Auth. O `src/proxy.ts` protege rotas por perfil (nesta versão do Next.js o antigo *middleware* se chama *proxy*).
11. **Segredos.** Só variáveis `NEXT_PUBLIC_*` vão ao navegador. A chave de serviço do Supabase nunca é usada no navegador e só aparece em código de servidor.

## Convenções de arquivo

- Arquivos em `kebab-case`; componentes e classes em `PascalCase`.
- Sufixos: `.entity.ts`, `.repository.ts`, `.repository-impl.ts`, `.usecase.ts`, `.model.ts`, `.mapper.ts`, `.adapter.ts`, `.state.ts`, `.actions.ts`.
- Componentes de view terminam em `View`: `BookListView`, `BookListLoadingView`.
- Imports com o alias `@/` partindo de `src/`.
- Nomes de código em **inglês** (`Book`, `Loan`); textos que o usuário vê, em português.

## Não permitido

- Importar `react`, `next/*` ou `@supabase/*` dentro de `src/domain/`.
- Chamar `fetch` ou o Supabase direto de um componente.
- Criar a tela de carregamento como componente escondido dentro da page.
- Criar repositório ou caso de uso dentro de uma view.
- Regra de negócio dentro de componente.
- Tabela sem RLS.
- Imports que dão a volta (A importa B e B importa A).
- Lógica dentro de `src/app/`. Ali só ficam arquivos de rota.

## Critérios de aceitação (qualidade)

- A feature segue a estrutura e o fluxo de dependência.
- Page controla os cenários; view só trata sucesso.
- Dependências montadas em `main/di/<feature>.dependencies.ts`.
- Testes: caso de uso (regra de negócio) e fluxo principal da page.
- Passam: `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`.
- O PR descreve o que mudou e como testar (ver [qualidade.md](qualidade.md)).

## Processo de evolução

1. Gere a feature com `scripts/arch/create-feature-web.sh <feature>`.
2. Troque os nomes de exemplo pelo domínio real.
3. Ligue a rota em `src/app/`.
4. Crie a migration das tabelas (ver [supabase.spec.md](supabase.spec.md)).
5. Escreva os testes e rode as verificações.

Guia prático: [frontend.skills.md](frontend.skills.md).
