# Frontend Skills — Clean Architecture + Next.js + Supabase

Guia prático para implementar uma feature. As regras completas estão em [frontend.spec.md](frontend.spec.md). Se algo aqui soar estranho, o [Guia do aluno](guia-do-aluno.md) explica cada conceito do zero.

## O que cada camada faz

- **domain:** o que o sistema é e as regras do negócio
- **data:** como trazer e levar dados (cumpre o que o domain pede)
- **infra:** a ligação com o Supabase
- **presenter:** o estado da tela
- **modules:** a tela (page, views, widgets)
- **main/di:** a montagem das peças

## Skills (regras práticas)

1. **A page decide o cenário.** Carregando, erro, vazio e sucesso.
2. **A view só mostra sucesso.** Sem `if (loading)` e sem busca de dados dentro dela.
3. **O presenter não desenha tela.** Hooks devolvem estado e funções; Server Actions devolvem um resultado.
4. **O domain não conhece framework.** Nenhum import de React, Next ou Supabase.
5. **O data cumpre o contrato.** O repositório usa o adaptador e converte o dado do banco em entidade com o mapper.
6. **A infra esconde o Supabase.** Quem precisa de dados nunca fala com o Supabase direto.
7. **Montagem por funções.** Um arquivo `main/di/<feature>.dependencies.ts` com `makeXxx()`.
8. **Servidor por padrão.** Busque dados no servidor e passe para a view por props. `"use client"` só para o que é interativo.
9. **Widgets simples.** Pedaços reutilizáveis ficam em `modules/<feature>/widgets/`.
10. **Nomes claros.** `kebab-case` nos arquivos, `PascalCase` nos componentes, código em inglês.
11. **Regra com teste.** Toda regra do negócio (limite, prazo, multa) tem teste.
12. **Banco sempre protegido.** Toda tabela nova nasce com RLS e permissões explícitas.

## Receita rápida

1. Domain: entity, repository (contrato) e usecase.
2. Data: model, mapper e repository-impl.
3. Infra: adapter que fala com o Supabase.
4. Presenter: state, hook e actions.
5. Modules: page, views (sucesso, loading, erro, vazio) e widgets.
6. Main/di: `make<Feature>()`.
7. App: rota curta com `loading.tsx` e `error.tsx`.
8. Banco: migration com tabela, RLS e permissões.
9. Testes, lint, typecheck e build.

## Exemplo de page

```tsx
// src/modules/books/page/books-page.tsx
import { Suspense } from "react";
import { makeListBooks } from "@/main/di/books.dependencies";
import { BooksView } from "./view/books-view";
import { BooksEmptyView } from "./view/books-empty-view";
import { BooksLoadingView } from "./view/books-loading-view";

async function BooksContent() {
  const books = await makeListBooks().execute();
  if (books.length === 0) return <BooksEmptyView />;
  return <BooksView books={books} />;
}

export function BooksPage() {
  return (
    <Suspense fallback={<BooksLoadingView />}>
      <BooksContent />
    </Suspense>
  );
}
```

A rota `src/app/livros/page.tsx` só devolve `<BooksPage />`. Se der erro, o Next.js mostra o `error.tsx`.

## Exemplo de montagem

```ts
// src/main/di/books.dependencies.ts
import { createServerClient } from "@/infra/supabase/server-client";
import { BooksSupabaseAdapter } from "@/infra/adapters/books/books-supabase.adapter";
import { BooksRepositoryImpl } from "@/data/books/repositories/books.repository-impl";
import { ListBooksUseCase } from "@/domain/books/usecases/list-books.usecase";

export function makeListBooks() {
  const adapter = new BooksSupabaseAdapter(createServerClient);
  const repository = new BooksRepositoryImpl(adapter);
  return new ListBooksUseCase(repository);
}
```

## Definition of Done

- Estrutura de pastas segue o spec.
- Page decide o cenário; view só mostra sucesso.
- Nenhum import proibido no `domain`.
- Tabela com RLS e permissões.
- Testes, lint, typecheck e build passando.
- PR com descrição clara.

## Scaffold

```bash
scripts/arch/create-feature-web.sh <feature-em-kebab-case>
```

Detalhes em [feature.template.md](feature.template.md).
