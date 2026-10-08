# Frontend Skills — passo a passo

Guia prático para criar uma tela ou feature. As regras completas estão em [frontend.spec.md](frontend.spec.md). Se algo soar estranho, o [Guia do aluno](guia-do-aluno.md) explica cada conceito do zero.

## Em uma frase

> A tela pede dados ao **service**, o service fala com o **Supabase**, e a tela só mostra o resultado.

## Skills (regras práticas)

1. **Um componente por arquivo**, com nome em `PascalCase` e `interface` de props.
2. **Todo componente novo entra no `index.tsx`** de `src/components`.
3. **A `page` busca dados no servidor** (função `async`) e passa para os componentes por props.
4. **`"use client"` só quando precisar:** `useState`, formulário ou clique.
5. **Quatro cenários em toda tela com dados:** carregando (`loading.tsx`), erro (`error.tsx`), vazio e sucesso.
6. **Só o `service` fala com o Supabase.** Componente e `page` nunca.
7. **Tipo para tudo.** Descreva os dados em `src/types`.
8. **Regra do negócio vira função pura com teste** (Nível 2, em `src/domain`).
9. **Banco protegido.** Toda tabela nova nasce com RLS e `grant`.
10. **Pergunte antes** de criar pasta, camada ou tecnologia nova.

## Receita: criar a tela "Livros"

1. **Card.** Mova o card para In Progress e crie a branch `FAP/<número>`.
2. **Gerar a base.** `scripts/arch/create-feature-web.sh books Book`.
3. **Tipo.** Ajuste `src/types/books.ts` com os campos reais.
4. **Banco.** `scripts/arch/create-migration.sh create_books_table` e escreva o SQL com RLS.
5. **Service.** Ajuste `src/services/books.service.ts` (nome da tabela e colunas).
6. **Componentes.** Desenhe a lista em `src/components/BooksList.tsx` (já criado como exemplo).
7. **Página.** Confira `src/app/books/page.tsx`, `loading.tsx` e `error.tsx`.
8. **Verificar.** `npm run lint`, `npm run typecheck` e `npm run build`.
9. **Commit e PR** para a `develop`.

## Exemplo de página

```tsx
// src/app/books/page.tsx
import { BooksList } from "@/components";
import { listBooks } from "@/services/books.service";

export default async function BooksPage() {
  const books = await listBooks();

  if (books.length === 0) {
    return <p>Nenhum livro cadastrado ainda.</p>;
  }

  return <BooksList books={books} />;
}
```

O `loading.tsx` da mesma pasta aparece enquanto `listBooks()` busca. Se der erro, o Next.js mostra o `error.tsx`.

## Exemplo de service

```ts
// src/services/books.service.ts
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { Book } from "@/types/books";

export async function listBooks(): Promise<Book[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("books").select("id, name");
  if (error) throw new Error(error.message);
  return data ?? [];
}
```

## Exemplo de regra (Nível 2)

```ts
// src/domain/loans/loan-rules.ts
export const MAX_ACTIVE_LOANS = 5;
export const FINE_PER_DAY_IN_CENTS = 100;

export function canBorrow(activeLoans: number): boolean {
  return activeLoans < MAX_ACTIVE_LOANS;
}

export function calculateFine(daysLate: number): number {
  return Math.max(0, daysLate) * FINE_PER_DAY_IN_CENTS;
}
```

## Definition of Done

- Estrutura segue o spec.
- Tela trata carregando, erro, vazio e sucesso.
- Só o `service` fala com o Supabase.
- Tabela com RLS e `grant`.
- Regra do negócio com teste.
- Lint, typecheck e build passando.
- PR com descrição clara.

## Scaffold

```bash
scripts/arch/create-feature-web.sh <feature-em-kebab-case> [EntidadeNoSingular]
```

Detalhes em [feature.template.md](feature.template.md).
