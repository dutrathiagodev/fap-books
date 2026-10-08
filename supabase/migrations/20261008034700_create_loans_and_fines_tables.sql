-- Migration: cria empréstimos e multas (RF-10 a RF-15 e RF-21 a RF-23).
-- Regras como "máximo de 5 livros" e o cálculo da multa ficam no código (src/domain), com teste.

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  borrowed_at timestamptz not null default now(),
  due_at timestamptz not null,                    -- prazo de devolução (padrão: 7 dias)
  returned_at timestamptz,                        -- vazio enquanto o livro não voltou
  renewals integer not null default 0 check (renewals >= 0),
  created_by uuid references public.profiles (id) on delete set null, -- quem registrou
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loans_due_after_borrowed check (due_at > borrowed_at)
);

create trigger loans_set_updated_at
  before update on public.loans
  for each row execute function public.set_updated_at();

create index idx_loans_user_id on public.loans (user_id);
create index idx_loans_book_id on public.loans (book_id);
-- Acelera "quais empréstimos estão em aberto" (limite de 5 e disponibilidade).
create index idx_loans_open on public.loans (user_id, book_id) where returned_at is null;

-- Multa: no máximo uma por empréstimo. Valor em centavos (R$ 1,00 por dia = 100).
create table public.fines (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null unique references public.loans (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  days_late integer not null check (days_late > 0),
  amount_cents integer not null check (amount_cents >= 0),
  paid_at timestamptz,                            -- baixa manual feita pela bibliotecária
  paid_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger fines_set_updated_at
  before update on public.fines
  for each row execute function public.set_updated_at();

create index idx_fines_user_id on public.fines (user_id);

alter table public.loans enable row level security;
alter table public.fines enable row level security;

grant select, insert, update, delete on public.loans to authenticated;
grant select, insert, update, delete on public.fines to authenticated;

-- A pessoa vê só os próprios empréstimos e multas; a bibliotecária vê tudo.
create policy "loans_select_own_or_librarian" on public.loans
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_librarian());

create policy "loans_write_librarian" on public.loans
  for all to authenticated
  using (public.is_librarian())
  with check (public.is_librarian());

create policy "fines_select_own_or_librarian" on public.fines
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_librarian());

create policy "fines_write_librarian" on public.fines
  for all to authenticated
  using (public.is_librarian())
  with check (public.is_librarian());
