# Supabase Spec — Banco, Migrations, RLS, Login e Arquivos

Documento normativo do banco de dados do FAP Books. Se você nunca trabalhou com banco de dados, leia antes a parte de banco do [Guia do aluno](guia-do-aluno.md).

O projeto Supabase se chama `fap-books`, fica na região **Brasil (São Paulo)** e usa o plano gratuito.

## O que o Supabase faz por nós

| Parte | Para que serve | Exemplo no FAP Books |
| -- | -- | -- |
| **Postgres** | O banco de dados: tabelas com linhas e colunas | Tabelas de livros, usuários, empréstimos |
| **Auth** | Login e senha, e quem está logado | Aluno entra no sistema |
| **Storage** | Guarda arquivos | Capa de um livro |
| **RLS** | Regras que dizem quem pode ver ou mudar cada linha | Aluno só vê os próprios empréstimos |

## Regra de ouro: o banco é versionado

Toda mudança no banco é um arquivo de **migration** guardado no Git, em `supabase/migrations/`. Ninguém muda o banco só clicando no painel, porque assim o time inteiro perde o histórico e os ambientes ficam diferentes.

1. Crie o arquivo: `scripts/arch/create-migration.sh <nome_da_mudanca>` (usa `supabase migration new`).
2. Escreva o SQL.
3. Aplique no seu banco local ou de teste e confira.
4. Abra o PR com a migration. Depois do merge, ela é aplicada no projeto real.
5. **Nunca edite uma migration que já foi aplicada.** Crie uma nova.

Nome do arquivo: `AAAAMMDDHHMMSS_verbo_objeto.sql` (por exemplo, `20261010120000_create_books_table.sql`). Uma migration, uma ideia.

## RLS: toda tabela, sempre

**RLS** (Row Level Security) é uma regra do banco que filtra as linhas de acordo com quem está pedindo. Como o site fala direto com o Supabase, é o RLS que impede um aluno de ler dados dos outros.

Em **toda** migration que cria tabela:

1. Ligue o RLS: `alter table public.<tabela> enable row level security;`
2. Dê as permissões mínimas com `grant` (este projeto foi criado com a opção de expor tabelas automaticamente **desligada**, então sem `grant` ninguém acessa).
3. Crie as policies (regras) por perfil.

Exemplo para livros: qualquer usuário logado lê; só a bibliotecária escreve.

```sql
create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  code text not null unique,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.books enable row level security;

grant select on public.books to authenticated;
grant insert, update, delete on public.books to authenticated;

create policy "books_select_logged_in" on public.books
  for select to authenticated using (true);

create policy "books_write_librarian" on public.books
  for all to authenticated
  using (public.is_librarian())
  with check (public.is_librarian());
```

## Perfis de usuário

Existe uma tabela `profiles` ligada ao usuário do login, com o perfil (`student`, `teacher` ou `librarian`). A função auxiliar `is_librarian()` lê essa tabela. Funções que leem tabelas protegidas usam `security definer` e **sempre** `set search_path = ''`.

## Convenções de nomes

- Tabelas e colunas em `snake_case`, tabelas no **plural** e em inglês: `books`, `loans`, `reservations`, `fines`.
- Chave primária `id` do tipo `uuid` com `default gen_random_uuid()`.
- Chave estrangeira `<tabela_no_singular>_id`: `book_id`, `user_id`.
- Toda tabela tem `created_at` e `updated_at` (`timestamptz`).
- Índice: `idx_<tabela>_<colunas>`. Policy: `<tabela>_<acao>_<quem>`.
- Dinheiro em centavos (`integer`), nunca em `float`.
- Status em `text` com `check` ou em um `enum` quando o conjunto for fixo.

## Auditoria

Toda ação importante (empréstimo, devolução, renovação, reserva) grava quem fez e quando, em uma tabela de auditoria preenchida pelo servidor. Nunca por confiança no navegador.

## Chaves

| Chave | Quem pode usar | Observação |
| -- | -- | -- |
| `anon` / publishable | Navegador | Segura só porque o RLS está ligado |
| `service_role` | **Somente código de servidor** | Ignora o RLS. Nunca no navegador, nunca no Git |

Chaves vão no `.env.local` (fora do Git) e nos secrets do GitHub. O modelo está em `.env.example`.

## Arquivos (Storage)

Capas de livros ficam num bucket `book-covers`. Leitura pública para as capas; envio só pela bibliotecária, por policy.

## Tipos do TypeScript

Depois de mudar o banco, gere os tipos: `supabase gen types typescript` e guarde em `src/infra/supabase/database.types.ts`. Assim o TypeScript avisa se um nome de coluna estiver errado.

## Checklist de revisão de migration

- [ ] Nome no padrão e uma ideia só
- [ ] RLS ligado em toda tabela nova
- [ ] `grant` mínimo e policies por perfil
- [ ] Funções com `security definer` usam `set search_path = ''`
- [ ] Chaves estrangeiras e índices nas colunas de busca
- [ ] `created_at` e `updated_at`
- [ ] Nenhuma migration antiga foi editada
- [ ] Testei com um usuário aluno e um usuário bibliotecária
- [ ] Tipos do TypeScript gerados de novo

## Quem fala com o banco

Só **código de servidor** do Next.js (Server Components e Server Actions), pelo cliente em `src/infra/supabase/server-client.ts`, usando a sessão do usuário. O navegador usa o Supabase apenas para login e para arquivos públicos.
