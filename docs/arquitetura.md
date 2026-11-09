# Arquitetura

O FAP Books tem duas peças: o site (**Next.js 16**) e o **Supabase** (banco, login e arquivos). Não há API separada. Decisão de 08/10/2026: o time está aprendendo, então menos peças; NestJS só entra se o time decidir. Antes de criar pasta, camada ou tecnologia nova, pergunte ao responsável.

## Onde fica cada coisa

```text
src/
  app/              rotas (uma pasta por endereço): page.tsx, loading.tsx, error.tsx
  app/actions/      Server Actions (login, newsletter)
  components/       componentes, um por arquivo; todos reexportados em index.tsx
  services/         único lugar que fala com o Supabase (ex.: books.service.ts)
  domain/<tema>/    regras do negócio em funções puras, com teste ao lado
  types/            formato dos dados (book.ts, profile.ts)
  lib/supabase/     clientes do Supabase (browser-client.ts, server-client.ts, env.ts)
  lib/require-role.ts  confere o perfil na página
  content/          textos e listas da landing
  proxy.ts          protege as rotas por perfil (no Next 16 é o antigo middleware)
supabase/
  migrations/       todo o banco, versionado
  tests/            SQL das regras de acesso (RLS)
  seed.sql          dados de teste
scripts/arch/       geradores de feature e de migration
```

Código em inglês, textos da tela em português. Imports com `@/` apontando para `src/`.

## Regras de dependência

| Pasta | Pode usar | Não pode |
| -- | -- | -- |
| `app` | `components`, `services`, `domain`, `types`, `lib` | Falar com o Supabase direto |
| `components` | outros `components`, `domain`, `types` | Buscar dados, conhecer o Supabase |
| `services` | `lib`, `domain`, `types` | Importar de `app` ou `components` |
| `domain` | `types` | React, Next, Supabase |
| `types` | nada | Ter lógica |

Combinado: **a tela pede ao `service`, e só o `service` fala com o Supabase.**

## Como criar uma feature

1. Mova o card para In Progress e crie a branch `FAP/<número do card>`.
2. Gere a base: `scripts/arch/create-feature-web.sh books Book` (cria tipo, service, componente e rota com carregando, erro, vazio e sucesso). Se a feature já existe, o script não altera nada.
3. Troque os campos de exemplo pelos reais, começando por `src/types`.
4. Se mexe no banco: `scripts/arch/create-migration.sh create_books_table` e escreva o SQL (regras abaixo).
5. Regra do negócio (limite de 3 itens, prazo de 7 dias, multa de R$ 1,00 por dia) vai para `src/domain/<tema>/`, com teste. O service chama a regra antes de salvar.
6. Rode `npm run typecheck`, `npm run lint` e `npm test` (veja [qualidade-de-software.md](qualidade-de-software.md)) e abra o PR para a `develop`.

Regras do código das telas:

- Um componente por arquivo, em `PascalCase`, com `interface` das props, e exportado em `index.tsx`.
- `page.tsx` só monta a tela: busca dados no servidor (`async`) e passa por props. `"use client"` só onde há estado, formulário ou clique.
- Toda tela com dados trata os 4 cenários: carregando, erro, vazio e sucesso.
- Sem `any`; sem regra de negócio dentro de componente.

## Login e permissões

- O login é o Supabase Auth. Existem 3 perfis em `profiles.role`: `student`, `teacher` e `librarian`.
- Duas barreiras no site: o `proxy.ts` leva quem não entrou ao `/login` e deixa cada perfil na própria área; cada página chama `requireRole` de novo.
- A terceira barreira é o banco (RLS, abaixo). Permissão nunca vale só na tela.
- Só variáveis `NEXT_PUBLIC_*` vão ao navegador. A chave `service_role` ignora o RLS: só em código de servidor, nunca no Git.

## Supabase: banco, RLS e arquivos

O projeto `fap-books` fica na região Brasil (São Paulo), no plano gratuito.

- **Toda mudança no banco é uma migration** em `supabase/migrations/`, no padrão `AAAAMMDDHHMMSS_verbo_objeto.sql`, uma ideia por arquivo. Ninguém muda o banco só pelo painel. **Nunca edite uma migration já aplicada**: crie outra.
- **RLS em toda tabela**: `alter table ... enable row level security;`.
- **`grant` mínimo.** O projeto não expõe tabelas automaticamente, então sem `grant` ninguém acessa. Depois, uma policy por perfil.
- Funções auxiliares como `is_librarian()` usam `security definer` e **sempre** `set search_path = ''`.
- Nomes: tabelas e colunas em `snake_case`, tabela no plural; `id uuid`; chave estrangeira `<tabela_singular>_id`; `created_at` e `updated_at`; dinheiro em centavos (`integer`).
- **Auditoria** (`audit_logs`) é gravada pelo servidor e guarda só ids, nunca nome, e-mail ou texto livre (veja [database/lgpd.md](database/lgpd.md)).
- **Storage:** capas ficam no bucket público `book-covers`; só a bibliotecária envia, troca ou apaga (policy em `storage.objects`).

Exemplo mínimo de tabela:

```sql
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

Checklist de migration: nome no padrão; RLS ligado; `grant` e policies por perfil; `search_path` vazio nas funções `security definer`; índice nas colunas de busca; testado com aluno e bibliotecária (`supabase/tests/`). O modelo das tabelas está em [database/modelo-de-dados.md](database/modelo-de-dados.md).


## Regras de negócio que valem lembrar

**Multas (RF-22 e RF-23).**
- R$ 1,00 por dia de atraso (`fine_cents_per_day()` no banco e `FINE_PER_DAY_CENTS` em `src/domain/fines/fine-rules.ts`), em **dias corridos** entre o dia do prazo e o da devolução (ou de hoje, se o livro ainda não voltou), no calendário de Brasília. Devolver no dia do prazo, a qualquer hora, não é atraso. No máximo uma multa por empréstimo.
- Sábado, domingo, feriado e recesso **contam**: o regulamento do PRD não prevê exceção. Perdoar esses dias é decisão do dono e mexe em três lugares (`return_loan`, a tarefa diária e `calculateDaysLate`); está testado em `fine-rules.test.ts` para ninguém mudar sem perceber.
- A mesma conta existe em três lugares: `return_loan` (grava a multa na devolução), `scripts/agendadas/multas-por-atraso.sql` (tarefa diária, cresce um dia por dia nos empréstimos em aberto e nunca altera multa paga) e `calculateFine` no código. Testes: `supabase/tests/04-pagar-multa.sql` e `fine-rules.test.ts`.
- A baixa é presencial e manual. `public.pay_fine(p_fine_id, p_idempotency_key)` é a única forma de gravar a baixa: só a funcionária, grava `paid_at` e `paid_by`, audita `fine_paid` só com ids e usa `claim_action_key`. Depois da baixa, `create_loan` e `renew_loan` deixam de bloquear o usuário por aquela multa.

**Limite de dias da reserva pedagógica (RF-18).** O padrão é 30 dias e a funcionária altera na fila de reservas (campo "Prazo máximo (dias)", de 1 a 365). Fica na tabela `library_settings` e só se altera por `set_pedagogical_max_days()` (só funcionária, com auditoria). O limite vale na criação do pedido; reservas já feitas não mudam.

**Importação de livros por planilha.** `.csv` ou `.xlsx` (primeira aba), até 200 KB, 100 livros por envio, colunas `titulo`, `autor`, `categoria`, `codigo`, `quantidade` (obrigatórias) e `isbn`, `editora`, `edicao`. As linhas boas entram e as ruins voltam com o número da linha e o motivo (as que entraram não se repetem; código repetido recusa só aquela linha). O `.xlsx` só muda como as linhas são lidas: passa pelo mesmo `parseBookRows` (`src/domain/books/book-import.ts`). O arquivo é conferido antes de abrir: tipo pelos primeiros bytes (`PK` para zip), índice do zip sem descompactar, sem macro (`vbaProject.bin`), até 8 MB descompactado (proteção contra zip bomb), no máximo 500 linhas e 20 colunas; qualquer falha da biblioteca vira "arquivo inválido" sem mostrar a mensagem original.
