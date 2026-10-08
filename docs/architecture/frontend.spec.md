# Frontend Spec — Next.js + Clean Architecture

Documento normativo para novas features do frontend (`apps/web`).

Modelo de referência: `feature.spec.md` do projeto Flutter white_label_barber, adaptado para Next.js (App Router), React e TypeScript.

## Escopo

Define como toda feature do frontend é estruturada: camadas, fluxo de dependência, composição de dependências e composição de UI. O backend está em [backend.spec.md](backend.spec.md) e o banco em [supabase.spec.md](supabase.spec.md).

## Camadas obrigatórias

Cada feature tem estas camadas, dentro de `apps/web/src`:

| Camada | Pasta | Responsabilidade |
| -- | -- | -- |
| domain | `domain/<feature>/` | Entidades, contratos de repositório e casos de uso. Regras de negócio puras |
| data | `data/<feature>/` | Implementações dos contratos do domain, DTOs e mapeadores |
| infra | `infra/` | Clientes e adaptadores de fontes externas (API NestJS, Supabase Auth/Storage) |
| presenter | `presenter/<feature>/` | Estado de tela: hooks e Server Actions que orquestram casos de uso |
| modules | `modules/<feature>/` | Composição de UI: page, views e widgets |
| main | `main/di/` | Montagem das dependências (composition root). Só monta, não decide |
| app | `app/` | Rotas do Next.js. Apenas arquivos finos que chamam a page do módulo |

## Fluxo de dependência (sempre nesta direção)

```text
app → modules → presenter → domain
data → domain
infra → data
main/di → todas (somente para montagem)
```

O `domain` não importa nada de React, Next.js, Supabase nem `fetch`. É TypeScript puro.

## Estrutura obrigatória por feature

```text
apps/web/src/
  app/<rota>/page.tsx                  # fino: chama modules/<feature>/page
  app/<rota>/loading.tsx               # cenário de carregamento da rota
  app/<rota>/error.tsx                 # cenário de erro da rota
  domain/<feature>/
    entities/<feature>.entity.ts
    repositories/<feature>.repository.ts
    usecases/<verbo>-<feature>.usecase.ts
  data/<feature>/
    models/<feature>.model.ts          # DTO como vem da API
    mappers/<feature>.mapper.ts        # model → entity
    repositories/<feature>.repository-impl.ts
  infra/
    http/api-client.ts                 # cliente da API NestJS
    supabase/browser-client.ts         # sessão no navegador
    supabase/server-client.ts          # sessão no servidor
    adapters/<feature>/<feature>-api.adapter.ts
  presenter/<feature>/
    <feature>.state.ts                 # tipos do estado da tela
    use-<feature>.ts                   # hook (Client Component)
    <feature>.actions.ts               # Server Actions de escrita
  modules/<feature>/
    page/<feature>-page.tsx            # decide os cenários
    page/view/<feature>-view.tsx       # sucesso
    page/view/<feature>-loading-view.tsx
    page/view/<feature>-error-view.tsx
    page/view/<feature>-empty-view.tsx
    widgets/                           # componentes reutilizáveis da feature
  main/di/
    container.ts                       # monta o que é global
    <feature>.dependencies.ts          # monta repositório e casos de uso da feature
```

## Regras

1. **A rota é fina.** `app/<rota>/page.tsx` só importa e renderiza a page do módulo. Não tem regra nem dependência instanciada.
2. **A page decide os cenários.** Em `modules/<feature>/page/<feature>-page.tsx`: loading, erro, vazio e sucesso. Em Server Component, a page chama o caso de uso e usa `<Suspense fallback={<…LoadingView />}>`; erros vão para `error.tsx`; lista vazia vira `<…EmptyView />`.
3. **A view renderiza só o sucesso.** Recebe dados e callbacks por props. Não busca dados, não instancia dependência e não decide loading, erro ou vazio.
4. **Client Component só onde há interatividade.** Use `"use client"` na menor folha possível. Dados e casos de uso rodam no servidor sempre que dá.
5. **O domain não conhece a infraestrutura.** Casos de uso dependem de interfaces (`<feature>.repository.ts`), nunca de `fetch` ou do SDK do Supabase.
6. **Data implementa os contratos do domain.** O `repository-impl` recebe o adaptador de `infra` e usa o mapeador para devolver entidades.
7. **Composição em um lugar só.** Cada feature tem `main/di/<feature>.dependencies.ts` com funções de fábrica (`makeListBooks()`). A page chama a fábrica. Sem framework de DI e sem `new` de repositório dentro de componente.
8. **Autenticação.** A sessão vem do Supabase Auth. O `proxy.ts` (substitui o middleware nesta versão do Next.js) protege rotas por perfil. Chamadas à API levam o token da sessão.
9. **Segredos.** Só variáveis `NEXT_PUBLIC_*` vão ao navegador. A chave de serviço do Supabase nunca é usada no frontend.

## Convenções de arquivo

- Arquivos em `kebab-case`, componentes e classes em `PascalCase`.
- Sufixos: `.entity.ts`, `.repository.ts`, `.repository-impl.ts`, `.usecase.ts`, `.model.ts`, `.mapper.ts`, `.adapter.ts`, `.state.ts`, `.actions.ts`.
- Componentes de view terminam com `View`: `BookListView`, `BookListLoadingView`.
- Imports com alias `@/` partindo de `src/`.

## Não permitido

- Importar `react`, `next/*` ou `@supabase/*` dentro de `domain/`.
- Chamar `fetch` ou o Supabase direto de um componente.
- Criar state view como componente privado dentro da page.
- Instanciar repositório ou caso de uso dentro de uma view.
- Regra de negócio (prazo, multa, limite de livros) em widget. Ela vive no domain do backend e, se houver cópia para validação de UX, no domain do frontend.
- Imports cíclicos entre camadas.
- Usar `src/app` para guardar lógica. Ali só ficam arquivos de rota.

## Critérios de aceitação

- A feature respeita a estrutura e o fluxo de dependência acima.
- A page controla os cenários e a view principal só trata sucesso.
- Dependências montadas em `main/di/<feature>.dependencies.ts`.
- Testes mínimos: caso de uso (Vitest) e fluxo principal da page (Testing Library).
- `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build` passam.

## Processo de evolução

1. Gerar a feature com `scripts/arch/create-feature-web.sh <feature>`.
2. Adaptar entidades, contratos e nomes ao domínio real.
3. Ligar a rota em `app/` e registrar a fábrica em `main/di/`.
4. Escrever os testes mínimos.
5. Validar com lint, typecheck, test e build.

Guia prático: [frontend.skills.md](frontend.skills.md).
