# Guia de Next.js

Documentação oficial: https://nextjs.org/docs

> **Atenção à versão.** Este projeto usa o **Next.js 16**, e muita coisa que você acha na internet é de versões antigas. Quando houver dúvida, leia a documentação **instalada no projeto**, que é da versão certa: `node_modules/next/dist/docs/` (depois do `npm install`). Os exemplos deste guia foram conferidos nela.

## O que é

Next.js é um framework **construído em cima do React**. O React desenha telas; o Next.js acrescenta o que falta para um site de verdade: **endereços (rotas)**, **código que roda no servidor**, carregamento, erro, imagens e otimizações.

> Analogia: o React é o balcão da biblioteca. O Next.js é o prédio inteiro: portas (rotas), corredores, a sala dos fundos (servidor) e os avisos de "fechado" e "carregando".

## 1. Rotas pelas pastas

Cada pasta dentro de `src/app` vira um endereço. O arquivo `page.tsx` é a tela daquele endereço.

```text
src/app/page.tsx            →  /
src/app/books/page.tsx      →  /books
src/app/books/[id]/page.tsx →  /books/123   (o [id] muda)
```

```tsx
// src/app/books/page.tsx
export default function BooksPage() {
  return <h1>Livros</h1>;
}
```

- A página precisa de `export default`.
- Para navegar entre páginas use `Link`, que não recarrega o site:

```tsx
// src/components/NavMenu.tsx
import Link from "next/link";

export function NavMenu() {
  return (
    <nav>
      <Link href="/">Início</Link>
      <Link href="/books">Livros</Link>
    </nav>
  );
}
```

## 2. Arquivos especiais de cada rota

Na pasta de uma rota, alguns nomes têm poder:

| Arquivo | Para quê |
| -- | -- |
| `page.tsx` | A tela |
| `layout.tsx` | O que envolve a tela e **não muda** ao navegar (cabeçalho, menu) |
| `loading.tsx` | Aparece **enquanto a página carrega** |
| `error.tsx` | Aparece **se algo der erro** |
| `not-found.tsx` | Aparece quando o endereço não existe |

Por isso as 4 situações de toda tela com dados são: **carregando** (`loading.tsx`), **erro** (`error.tsx`), **vazio** (um `if` na página) e **sucesso**.

## 3. Server Component e Client Component

Esta é a ideia mais importante do Next.js moderno.

| | Server Component (o padrão) | Client Component (`"use client"`) |
| -- | -- | -- |
| Roda onde | No **servidor**, antes de a página chegar | No **navegador** da pessoa |
| Pode buscar dados | **Sim**, direto, com `async` | Não (use o servidor) |
| Pode usar `useState`, `onClick` | **Não** | **Sim** |
| Quando usar | Mostrar dados | Formulário, clique, algo interativo |

```tsx
// src/app/books/page.tsx   →  Server Component (padrão)
import { BookList } from "@/components/BookList";

async function getBooks() {
  // aqui, no projeto real, você chama um service
  return [{ id: "1", title: "Dom Casmurro" }];
}

export default async function BooksPage() {
  const books = await getBooks();
  return <BookList books={books} />;
}
```

- A função da página é `async` e usa `await` para esperar os dados. Isso só pode em Server Component.
- Os dados chegam na tela **já prontos**, sem "piscar".

```tsx
// src/components/LikeButton.tsx   →  Client Component
"use client";

import { useState } from "react";

export function LikeButton() {
  const [liked, setLiked] = useState(false);
  return (
    <button type="button" onClick={() => setLiked(!liked)}>
      {liked ? "Curtido" : "Curtir"}
    </button>
  );
}
```

- `"use client"` precisa estar **na primeira linha**.
- **Regra prática:** comece sem `"use client"`. Só acrescente quando o Next.js reclamar de `useState`, `onClick` ou `useEffect`.
- Coloque o `"use client"` **na menor folha possível**, e não na página inteira.

## 4. Rotas com parâmetro (`[id]`)

Nesta versão do Next.js, `params` é uma **Promise**: você precisa de `await`.

```tsx
// src/app/books/[id]/page.tsx
export default async function BookPage(props: PageProps<"/books/[id]">) {
  const { id } = await props.params;
  return <h1>Livro {id}</h1>;
}
```

`PageProps` já existe sem precisar importar (o Next.js gera o tipo ao rodar `npm run dev`, `build` ou `npm run typecheck`). Se o editor reclamar que não encontra `PageProps`, rode `npm run typecheck` uma vez.

## 5. Mudar dados: Server Actions

Para salvar algo, uma função roda **no servidor** e a tela a chama. Isso se chama **Server Action**.

```tsx
// src/app/books/new/page.tsx
async function createBook(formData: FormData) {
  "use server";
  const title = formData.get("title");
  console.log("Novo livro:", title);
  // no projeto real: chamar o service que salva no Supabase
}

export default function NewBookPage() {
  return (
    <form action={createBook}>
      <input name="title" placeholder="Título" required />
      <button type="submit">Salvar</button>
    </form>
  );
}
```

- `"use server"` dentro da função marca que ela roda no servidor.
- O formulário usa `action={createBook}` (e não `onSubmit`). Os campos chegam em `formData`.
- **Sempre valide e confira quem está pedindo.** A Server Action pode ser chamada por qualquer pessoa: nunca confie nos dados que chegam.
- Depois de salvar, peça ao Next.js para atualizar a tela com `revalidatePath("/books")` (de `next/cache`).

## 6. Variáveis de ambiente

As chaves ficam no arquivo `.env.local` (que **nunca** vai para o Git).

- Variáveis que começam com `NEXT_PUBLIC_` vão para o navegador. Use só para coisas públicas (a URL e a chave pública do Supabase).
- As outras ficam só no servidor.
- Depois de mudar o `.env.local`, **pare e rode de novo** o `npm run dev`.

## 7. Comandos do dia a dia

```bash
npm run dev         # abre em http://localhost:3000 e atualiza sozinho
npm run lint        # confere o estilo do código
npm run typecheck   # confere os tipos
npm run build       # simula o que vai para produção
```

## Erros comuns

| Sintoma | Causa | Solução |
| -- | -- | -- |
| `You're importing a component that needs useState... Add "use client"` | Usou `useState` ou `onClick` em Server Component | Coloque `"use client"` na primeira linha daquele componente |
| `params` dá erro ou vem `undefined` | Esqueceu o `await` em `props.params` | `const { id } = await props.params` |
| A página mostra dado antigo | Cache | Depois de salvar, use `revalidatePath` |
| Mudei o `.env.local` e nada mudou | O servidor não leu de novo | Pare (`Ctrl+C`) e rode `npm run dev` |
| Hydration error | O HTML do servidor é diferente do navegador (data, número aleatório) | Evite valores que mudam a cada render na tela |
| `Module not found: @/...` | O `@/` aponta para `src/` | Confira se o arquivo existe em `src/` |

## Dicas de quem trabalha com Next.js

1. **Leia a documentação da versão.** Tutoriais de 2022 ensinam o `pages/` e o `getServerSideProps`, que não são mais o caminho.
2. **Busque dados no servidor, não no navegador.** É mais rápido, mais seguro e mais simples.
3. **Um arquivo, uma responsabilidade.** Página monta a tela, componente desenha, service fala com o banco.
4. **Pense nas 4 situações** de toda tela: carregando, erro, vazio e sucesso.
5. **Rode `npm run build` antes do PR.** Muita coisa só quebra na build.
6. **Use `next/image` e `next/link`** em vez de `<img>` e `<a>` para links e imagens internas.
7. **Acessibilidade:** botão é `<button>`, link é `<Link>`, campo tem `label`.

## No FAP Books

- Rotas em `src/app`, componentes em `src/components`, dados nos `services`.
- O `src/proxy.ts` (antigo *middleware*) renova a sessão do Supabase a cada requisição.
- O projeto usa `cacheComponents`, por isso páginas que dependem de quem acessa leem os cookies antes de qualquer outra coisa (já feito em `src/lib/supabase/server-client.ts`).
