# Frontend Skills — Clean Architecture + Next.js

Guia prático para implementar uma feature do frontend (`apps/web`). As regras normativas estão em [frontend.spec.md](frontend.spec.md).

## Objetivo

Manter as features consistentes, com camadas claras:

- **domain:** contratos e regras de negócio
- **data:** implementações dos contratos
- **infra:** adaptadores de fontes externas (API NestJS, Supabase)
- **presenter:** estado de tela (hooks e Server Actions)
- **modules:** composição da tela (page, views e widgets)
- **main/di:** montagem das dependências

## Skills (regras práticas)

1. **A page decide os cenários.** Loading, erro, vazio e sucesso ficam na page.
2. **A view principal só renderiza sucesso.** Sem `useEffect` de busca e sem `if (loading)` dentro dela.
3. **O presenter não conhece JSX.** Hooks devolvem estado e funções; Server Actions devolvem resultado tipado.
4. **O domain não depende de framework.** Sem React, Next ou Supabase nos imports.
5. **O data implementa o contrato.** `repository-impl` recebe o adaptador da infra e converte o `model` em `entity` com o mapeador.
6. **A infra esconde o detalhe externo.** URL da API, token, SDK do Supabase e storage ficam em `infra/`.
7. **DI por feature.** Um arquivo `main/di/<feature>.dependencies.ts` com fábricas: adapter → repository → usecase.
8. **Server Component por padrão.** Busque dados no servidor e passe para a view por props. `"use client"` só para formulário, evento e estado local.
9. **UI sem estado quando possível.** Widgets puros em `modules/<feature>/widgets/`.
10. **Nomes claros.** `kebab-case` nos arquivos, `PascalCase` nos componentes, sem abreviações ambíguas.
11. **Testes mínimos.** Caso de uso com repositório falso e o fluxo principal da page.

## Receita rápida

1. Criar entity, repository e usecase em `domain/<feature>/`.
2. Criar model, mapper e repository-impl em `data/<feature>/`.
3. Criar o adaptador em `infra/adapters/<feature>/`.
4. Criar state, hook e actions em `presenter/<feature>/`.
5. Criar page, views (sucesso, loading, erro, vazio) e widgets em `modules/<feature>/`.
6. Criar a fábrica em `main/di/<feature>.dependencies.ts`.
7. Criar a rota fina em `app/<rota>/page.tsx` (e `loading.tsx` e `error.tsx`).
8. Rodar lint, typecheck, test e build.

## Exemplo de page (Server Component)

```tsx
// modules/books/page/books-page.tsx
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

O erro vai para o `error.tsx` da rota. A rota em `app/livros/page.tsx` apenas devolve `<BooksPage />`.

## Definition of Done

- Estrutura de pastas segue o spec.
- Page centraliza a decisão de cenário; view só trata sucesso.
- Dependências montadas em `main/di`.
- Sem import proibido no `domain`.
- Lint, typecheck, testes e build passando.

## Scaffold

```bash
scripts/arch/create-feature-web.sh <feature-em-kebab-case>
```

Detalhes em [feature.template.md](feature.template.md).
