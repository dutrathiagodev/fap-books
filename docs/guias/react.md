# Guia de React

Para quem já viu componentes, props e `useState` em aula e quer **entender de verdade** o que está escrevendo.

Documentação oficial (em português): https://pt-br.react.dev

## O que é

React é uma biblioteca para **montar telas com pedaços reutilizáveis**, chamados **componentes**.

> Analogia: uma biblioteca tem fichas de livro, todas com o mesmo formato (título, autor, status). O React deixa você desenhar **uma** ficha e reutilizá-la para cada livro, trocando só os dados.

## 1. Componente

Um componente é uma **função que devolve um pedaço de tela** (escrito em JSX, um HTML dentro do JavaScript). O nome começa com **letra maiúscula**.

```tsx
// src/components/Greeting.tsx
export function Greeting() {
  return <h1>Olá, biblioteca da FAP!</h1>;
}
```

- `export function Greeting()` cria o componente e permite usá-lo em outros arquivos.
- `return <h1>…</h1>` é o que aparece na tela.
- Para usar: `<Greeting />`.

## 2. Props: os dados que o componente recebe

Props são **os parâmetros do componente**. Descreva-as em uma `interface` do TypeScript.

```tsx
// src/components/BookCard.tsx
interface BookCardProps {
  title: string;
  author: string;
}

export function BookCard({ title, author }: BookCardProps) {
  return (
    <article>
      <h2>{title}</h2>
      <p>{author}</p>
    </article>
  );
}
```

Uso: `<BookCard title="Dom Casmurro" author="Machado de Assis" />`.

- `{ title, author }` pega as props pelo nome (desestruturação).
- `{title}` dentro do JSX mostra o valor de uma variável. As chaves significam "aqui entra JavaScript".
- **Props só entram; o componente não as altera.** Para algo que muda, use estado.

## 3. Estado com `useState`

Estado é **um valor que o componente guarda e que, quando muda, redesenha a tela**.

```tsx
// src/components/LoanCounter.tsx
"use client";

import { useState } from "react";

export function LoanCounter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Livros emprestados: {count}</p>
      <button type="button" onClick={() => setCount(count + 1)}>
        Emprestar mais um
      </button>
    </div>
  );
}
```

- `useState(0)` cria o estado com valor inicial `0`.
- Devolve dois itens: `count` (o valor atual) e `setCount` (a função que troca o valor).
- **Nunca** faça `count = count + 1`. Sempre `setCount(...)`, senão a tela não atualiza.
- `"use client"` aparece porque o `useState` roda no navegador (explicado no guia de Next.js).

## 4. Eventos e formulários

```tsx
// src/components/SearchForm.tsx
"use client";

import { useState } from "react";

export function SearchForm() {
  const [term, setTerm] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // impede a página de recarregar
    console.log("Buscando por:", term);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Título ou autor"
      />
      <button type="submit">Buscar</button>
    </form>
  );
}
```

- `onChange` roda a cada letra digitada e guarda o texto no estado.
- `value={term}` faz o campo sempre mostrar o que está no estado (campo "controlado").
- `event.preventDefault()` é essencial em formulário: sem ele a página recarrega.

## 5. Listas e condições

```tsx
// src/components/BookList.tsx
interface Book {
  id: string;
  title: string;
}

export function BookList({ books }: { books: Book[] }) {
  if (books.length === 0) {
    return <p>Nenhum livro cadastrado ainda.</p>;
  }

  return (
    <ul>
      {books.map((book) => (
        <li key={book.id}>{book.title}</li>
      ))}
    </ul>
  );
}
```

- `.map()` transforma cada livro em um `<li>`.
- **`key` é obrigatória** e precisa ser única e estável (use o `id`, não o índice). É como o React sabe qual item mudou.
- O `if` no começo é o caso "vazio". Trate sempre: lista vazia, carregando e erro.

## 6. Componentes dentro de componentes

```tsx
// src/components/Shelf.tsx
import { BookCard } from "./BookCard";

export function Shelf() {
  return (
    <section>
      <BookCard title="Dom Casmurro" author="Machado de Assis" />
      <BookCard title="Quincas Borba" author="Machado de Assis" />
    </section>
  );
}
```

Telas grandes são **componentes pequenos montados juntos**. Se um arquivo passa de uns 100 linhas, provavelmente dá para dividir.

## Erros comuns

| Sintoma | Causa | Solução |
| -- | -- | -- |
| `Each child in a list should have a unique "key"` | Faltou `key` no `.map()` | Adicione `key={item.id}` |
| A tela não atualiza ao clicar | Mudou a variável direto, sem `setX` | Use a função do `useState` |
| A página recarrega ao enviar o formulário | Faltou `event.preventDefault()` | Adicione no `onSubmit` |
| `useState` dá erro em arquivo do Next.js | Falta `"use client"` no topo | Adicione na primeira linha |
| Componente não aparece | Nome em minúscula (`<card />`) | Componente sempre começa com maiúscula |

## Dicas de quem trabalha com React

1. **Componentes pequenos e com um papel só.** Se o nome pede um "e" (`ListaEBotao`), são dois componentes.
2. **Estado no menor lugar possível.** Só suba o estado para o componente pai quando dois filhos precisarem dele.
3. **Não duplique dados.** Se dá para calcular a partir de outro estado, calcule em vez de guardar.
4. **Nomeie pelo que é, não pelo que faz visualmente.** `OverdueBadge`, não `RedBox`.
5. **Evite o `useEffect` no começo.** Quase todo "buscar dados" deste projeto roda no servidor (veja o [guia de Next.js](nextjs.md)).
6. **Leia a mensagem de erro inteira.** O React diz o arquivo e a linha.
7. **Use a extensão de ferramentas do React no navegador** (React Developer Tools) para ver props e estado.

## No FAP Books

- Componentes em `src/components`, um arquivo por componente, exportados no `index.tsx`.
- Todo componente novo recebe suas props em uma `interface`.
- Componente **só desenha**: não busca dados nem fala com o Supabase.
