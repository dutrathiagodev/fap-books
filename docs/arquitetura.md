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
- Área do aluno (`/aluno`, `/aluno/emprestimos`, `/aluno/reservas`, `/aluno/multas`): `student.service.ts` lê só as linhas do aluno logado (filtro por id e RLS, sempre com limite); a renovação chama a `renew_loan` do banco, que confere dono, atraso, multa em aberto, reserva de outra pessoa e o limite de 3 renovações. Testes: `supabase/tests/07-area-do-aluno.sql`, `student-rules.test.ts` e `student.service.test.ts`.
- A mesma conta existe em três lugares: `return_loan` (grava a multa na devolução), `scripts/agendadas/multas-por-atraso.sql` (tarefa diária, cresce um dia por dia nos empréstimos em aberto e nunca altera multa paga) e `calculateFine` no código. Testes: `supabase/tests/04-pagar-multa.sql` e `fine-rules.test.ts`.
- A baixa é presencial e manual. `public.pay_fine(p_fine_id, p_idempotency_key)` é a única forma de gravar a baixa: só a funcionária, grava `paid_at` e `paid_by`, audita `fine_paid` só com ids e usa `claim_action_key`. Depois da baixa, `create_loan` e `renew_loan` deixam de bloquear o usuário por aquela multa.

**Relatórios (RF-27 a RF-29).** Tela `/funcionario/relatorios` (só funcionária: `RolePage`, `proxy.ts` e `decideRoute`) com três relatórios: livros em atraso, acervo por categoria e reservas pedagógicas. Os números saem de funções do banco (`report_overdue`, `report_inventory`, `report_pedagogical` e `report_pedagogical_counts`), todas `security definer` com `search_path` vazio e `is_librarian()`; cada uma devolve a página pedida e, em cada linha, o total do filtro inteiro (nunca mais de 1000 linhas por chamada) e usa índice (`idx_loans_open_by_due`, `idx_loans_returned_late`, `idx_books_category_status_qty`). O atraso usa a mesma regra da multa (dias corridos, Brasília, R$ 1,00 por dia); a multa do relatório é uma estimativa e, nos devolvidos, igual à gravada. "Disponíveis" do acervo desconta também os exemplares guardados por reserva pedagógica aprovada (como `book_availability`), por isso pode ser menor que o cartão do Painel, que só desconta empréstimos. Filtros (`tipo`, `de`, `ate`, `situacao`, `pagina`) ficam no endereço e são validados em `src/domain/reports/report-rules.ts`. A exportação é a rota de servidor `/funcionario/relatorios/exportar?formato=csv|pdf`: CSV em UTF-8 com BOM, separador `;` e células que começam com `=`, `+`, `-` ou `@` com apóstrofo; PDF escrito sem dependência (`src/domain/reports/report-export.ts`, Helvetica/WinAnsi, A4 deitado). Nada disso entra no pacote da tela. Testes: `supabase/tests/07-relatorios.sql`, `report-rules.test.ts` e `report-export.test.ts`.

**Fila de espera do livro indisponível (RF-13, cards 0044 e 0045).** Sem exemplar livre, aluno ou professor entra na fila do livro por ordem de chegada (`reserve_book`, só pela função: a tabela não aceita escrita direta). Uma reserva ativa por pessoa e livro (índice único parcial), com o mesmo limite de livros (3, ou 4 para formandos) e o mesmo bloqueio por atraso ou multa do empréstimo. Quando um exemplar volta, `return_loan` chama `promote_reservations`: o primeiro da fila vira `ready` (exemplar guardado) e tem `reservation_pickup_days()` = 2 dias para retirar (`expires_at`); passou do prazo, vira `expired` e a vez segue para o próximo (a expiração roda dentro das funções de empréstimo, devolução, reserva e cancelamento, e em `expire_overdue_reservations()` para uma rotina agendada, ainda não ligada). A pessoa cancela a própria reserva (`cancel_reservation`); a funcionária vê a fila no detalhe do livro, cancela, expira a pronta e abre o WhatsApp com a mensagem pronta (envio manual). Toda ação usa `claim_action_key` e é auditada (`reservation_created`, `reservation_cancelled`, `reservation_ready`, `reservation_expired`, só ids). Leituras: `list_my_reservations()` (as minhas, com posição) e `book_reservation_status()` (tamanho da fila e a minha situação), ambas sem dado de outras pessoas. No código: `src/services/reservations.service.ts` (`listMyReservations` é o contrato da tela "Minhas reservas", card 0216) e `src/domain/reservations/`. Testes: `supabase/tests/07-fila-de-espera.sql` e `07b-fila-concorrencia.sh`.

**Renovação da reserva pedagógica (RF-32, cards 0053 e 0055).** O professor pede mais dias de uma reserva aprovada na última semana do prazo (`renewal_window_days()` = 7) por `request_pedagogical_renewal`, que cria uma linha em `pedagogical_reservations` com `renewal_of` apontando para a original e entra na fila da funcionária marcada como "Renovação". Regras: só o dono, só reserva aprovada, dias de 1 até o limite configurável (`library_settings`), uma renovação pendente por reserva (índice único parcial) e período total de até 365 dias. A renovação não tem livros próprios (os exemplares são os da original), então o exemplar guardado nunca duplica e aprovar não exige exemplar livre. `decide_pedagogical_reservation` aprova (a original ganha os dias novos; se o fim já tinha passado, o novo período começa hoje) ou recusa (justificativa obrigatória; a original não muda). Devolver a original (`return_pedagogical_reservation`) encerra as renovações: as aprovadas viram `returned` e a pendente vira `cancelled`. Auditoria: reaproveita `pedagogical_requested`, `pedagogical_approved` e `pedagogical_rejected`, com `renewal_of_id` nos detalhes. Testes: `supabase/tests/08-renovacao-reserva-pedagogica.sql` e `08b-renovacao-concorrencia.sh`; regras da tela em `src/domain/pedagogical/renewal-rules.ts`.

**Limite de dias da reserva pedagógica (RF-18).** O padrão é 30 dias e a funcionária altera na fila de reservas (campo "Prazo máximo (dias)", de 1 a 365). Fica na tabela `library_settings` e só se altera por `set_pedagogical_max_days()` (só funcionária, com auditoria). O limite vale na criação do pedido; reservas já feitas não mudam.

**Importação de livros por planilha.** `.csv` ou `.xlsx` (primeira aba), até 200 KB, 100 livros por envio, colunas `titulo`, `autor`, `categoria`, `codigo`, `quantidade` (obrigatórias) e `isbn`, `editora`, `edicao`. As linhas boas entram e as ruins voltam com o número da linha e o motivo (as que entraram não se repetem; código repetido recusa só aquela linha). O `.xlsx` só muda como as linhas são lidas: passa pelo mesmo `parseBookRows` (`src/domain/books/book-import.ts`). O arquivo é conferido antes de abrir: tipo pelos primeiros bytes (`PK` para zip), índice do zip sem descompactar, sem macro (`vbaProject.bin`), até 8 MB descompactado (proteção contra zip bomb), no máximo 500 linhas e 20 colunas; qualquer falha da biblioteca vira "arquivo inválido" sem mostrar a mensagem original.
