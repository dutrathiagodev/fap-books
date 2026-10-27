# Guia de Supabase

Documentação oficial: https://supabase.com/docs

## O que é

Supabase é o **"backend pronto"** do projeto. Ele oferece, em um só lugar:

| Parte | O que faz | No FAP Books |
| -- | -- | -- |
| **Banco de dados** (Postgres) | Guarda os dados em tabelas | Livros, empréstimos, usuários |
| **Auth** | Cadastro, login e quem está logado | Aluno entra no sistema |
| **Storage** | Guarda arquivos | (futuro) |
| **RLS** | Regras de quem vê e muda cada linha | Aluno só vê os próprios empréstimos |

> Analogia: o banco é o arquivo da biblioteca, o Auth é o balcão que confere a carteirinha, e o RLS é o regulamento que diz quais gavetas cada pessoa pode abrir.

## 1. Banco de dados em 2 minutos

- Um banco é como uma **planilha organizada**. Cada **tabela** é uma aba (`books`, `loans`).
- Cada **linha** é um registro (um livro). Cada **coluna** é um campo (`title`, `author`).
- Tabelas se ligam por **chaves**: o empréstimo guarda o `book_id` do livro emprestado.
- A linguagem do banco é o **SQL**:

```sql
-- ler
select id, title from public.books where author = 'Machado de Assis';

-- criar
insert into public.books (title, author, code) values ('Dom Casmurro', 'Machado de Assis', 'C-001');

-- mudar
update public.books set quantity = 3 where code = 'C-001';

-- apagar
delete from public.books where code = 'C-001';
```

No projeto você quase não escreve SQL à mão: usa o cliente do Supabase (abaixo). Mas **mudanças na estrutura** (criar tabela) são *migrations*, que são arquivos SQL (veja [supabase.spec.md](../architecture/supabase.spec.md)). O desenho das tabelas do FAP Books está em [modelo-de-dados.md](../database/modelo-de-dados.md).

## 2. O cliente do Supabase no código

No projeto já existem dois clientes em `src/lib/supabase/`:

| Arquivo | Usar em |
| -- | -- |
| `server-client.ts` | Código do **servidor** (páginas, services, Server Actions) |
| `browser-client.ts` | Só login e logout, em componentes com `"use client"` |

## 3. Ler dados (SELECT)

Sempre dentro de um **service**, e nunca em componente ou página.

```ts
// src/services/books.service.ts
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export interface Book {
  id: string;
  title: string;
  author: string;
}

export async function listBooks(): Promise<Book[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("books")
    .select("id, title, author")
    .order("title");

  if (error) throw new Error(error.message);
  return data ?? [];
}
```

- `.from("books")` escolhe a tabela.
- `.select("id, title, author")` escolhe as colunas. Peça só o que usa.
- `.order("title")` ordena.
- O Supabase **sempre** devolve `{ data, error }`. **Confira o `error`.** Se der erro, `data` vem vazio.

Filtrar e buscar um só:

```ts
// src/services/books-find.service.ts
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export async function findBookByCode(code: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("books")
    .select("id, title, author")
    .eq("code", code) // onde code = valor
    .maybeSingle(); // devolve 1 linha ou null

  if (error) throw new Error(error.message);
  return data;
}

export async function searchBooks(term: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("books")
    .select("id, title, author")
    .ilike("title", `%${term}%`) // contém o texto, sem diferenciar maiúscula
    .limit(20);

  if (error) throw new Error(error.message);
  return data ?? [];
}
```

## 4. Gravar dados

```ts
// src/services/books-write.service.ts
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export async function createBook(book: { title: string; author: string; code: string }) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("books").insert(book);
  if (error) throw new Error(error.message);
}

export async function updateBookQuantity(id: string, quantity: number) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("books").update({ quantity }).eq("id", id);
  if (error) throw new Error(error.message);
}
```

> **Cuidado:** `update` e `delete` **sem `.eq(...)` atingem todas as linhas** que o RLS deixar. Sempre filtre.

## 5. Login (Auth)

Em um componente com `"use client"`:

```tsx
// src/components/LoginForm.tsx
"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export function LoginForm() {
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setMessage(error ? "E-mail ou senha incorretos." : "Login feito!");
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="E-mail" required />
      <input name="password" type="password" placeholder="Senha" required />
      <button type="submit">Entrar</button>
      <p>{message}</p>
    </form>
  );
}
```

- `signInWithPassword` confere e-mail e senha.
- Para sair: `supabase.auth.signOut()`.
- No servidor, para saber quem está logado: `const { data } = await supabase.auth.getUser()`.
- **Nunca** mostre ao usuário a mensagem de erro bruta do banco. Use uma mensagem sua.

## 6. RLS: a regra de quem vê o quê

O **RLS** (*Row Level Security*) é o que deixa seguro o site falar quase direto com o banco. Em toda tabela:

1. Liga o RLS: `alter table public.books enable row level security;`
2. Dá a permissão mínima: `grant select on public.books to authenticated;`
3. Escreve as regras (*policies*):

```sql
-- qualquer usuário logado lê os livros
create policy "books_select_logged_in" on public.books
  for select to authenticated using (true);

-- só a bibliotecária escreve
create policy "books_write_librarian" on public.books
  for all to authenticated
  using (public.is_librarian()) with check (public.is_librarian());
```

- `using` diz **quais linhas** a pessoa enxerga ou altera.
- `with check` diz **o que** ela pode gravar.
- **Tabela com RLS ligado e sem policy: ninguém acessa.** Se a lista voltar vazia, comece por aqui.
- **Tabela sem RLS está aberta para todos.** Nunca deixe assim.

## 7. As chaves

| Chave | Quem usa | Observação |
| -- | -- | -- |
| **Publishable** (`sb_publishable_...`) | Navegador e servidor | Pública. Só é segura porque o RLS está ligado |
| **Secret** (`sb_secret_...`) | **Só servidor** | Ignora o RLS. **Nunca** no navegador, no Git ou no chat |

A secret fica com o responsável pelo banco. No começo, **não precisa dela**.

## Erros comuns

| Sintoma | Causa | Solução |
| -- | -- | -- |
| A lista volta vazia, sem erro | RLS ligado e sem policy (ou sem `grant`) | Confira a migration: `grant select` e a policy de leitura |
| `permission denied for table` | Faltou `grant` | Nova migration com `grant ... to authenticated` |
| `new row violates row-level security policy` | A policy de escrita recusou | Confira se o perfil da pessoa pode gravar e o `with check` |
| `data` vem `null` | Houve erro | Leia `error.message` |
| `Faltam as variáveis do Supabase` | Falta o `.env.local` | Veja o [guia de ambiente](../onboarding.md) |
| Mudei o banco no painel e o time não viu | Mudança fora de migration | Toda mudança vira arquivo em `supabase/migrations/` |

## Dicas de quem trabalha com banco

1. **Peça só as colunas que usa.** `select("*")` é preguiça e custo.
2. **Sempre trate o `error`.** Banco falha: rede, regra, permissão.
3. **Nomes claros e padronizados:** tabelas no plural, colunas em `snake_case`.
4. **Apagar é raro.** Prefira marcar como inativo, para manter o histórico.
5. **Teste com dois usuários:** um que pode e um que não pode. Segurança só vale se foi testada.
6. **Dinheiro em centavos** (`integer`), nunca em número com vírgula.
7. **Migration é para sempre:** nunca edite uma que já foi aplicada; crie outra.
8. **Dúvida em SQL?** Teste num banco de teste, nunca no real.

## No FAP Books

- Só os **services** falam com o Supabase.
- Quem está logado vem de `getCurrentProfile()` (`src/services/profile.service.ts`), que lê o perfil ativo na tabela `profiles`. O papel (`student`, `teacher`, `librarian`) vem do banco, nunca do navegador.
- Dados de teste: `supabase/seed.sql` (20 livros e 3 empréstimos). Veja como rodar em [modelo-de-dados.md](../database/modelo-de-dados.md).
- Toda tabela tem RLS e `grant` explícito.
- Regras como "máximo de 5 livros" ficam no código (`src/domain`), com teste.
