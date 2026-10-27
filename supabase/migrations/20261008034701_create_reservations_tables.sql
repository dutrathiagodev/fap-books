-- Migration: cria as reservas de livro (aluno) e as reservas pedagógicas (professor).
-- RF-13 (reserva de livro indisponível) e RF-16 a RF-20 (reserva pedagógica, até 30 dias).

-- Reserva comum: o aluno entra na fila de um livro que está indisponível.
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'waiting'
    check (status in ('waiting', 'ready', 'fulfilled', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

create index idx_reservations_book_id on public.reservations (book_id);
create index idx_reservations_user_id on public.reservations (user_id);

-- Reserva pedagógica: o professor pede com antecedência; a bibliotecária aprova ou recusa.
create table public.pedagogical_reservations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  days integer not null check (days between 1 and 30),   -- prazo definido pelo professor, máximo 30
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'returned', 'cancelled')),
  requested_in_person boolean not null default false,    -- pedida no balcão da biblioteca
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  renewal_of uuid references public.pedagogical_reservations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pedagogical_reservations_set_updated_at
  before update on public.pedagogical_reservations
  for each row execute function public.set_updated_at();

create index idx_pedagogical_reservations_teacher_id on public.pedagogical_reservations (teacher_id);
create index idx_pedagogical_reservations_status on public.pedagogical_reservations (status);

-- Uma reserva pedagógica pode pedir vários livros.
create table public.pedagogical_reservation_books (
  reservation_id uuid not null references public.pedagogical_reservations (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete restrict,
  primary key (reservation_id, book_id)
);

create index idx_pedagogical_reservation_books_book_id on public.pedagogical_reservation_books (book_id);

alter table public.reservations enable row level security;
alter table public.pedagogical_reservations enable row level security;
alter table public.pedagogical_reservation_books enable row level security;

grant select, insert, update, delete on public.reservations to authenticated;
grant select, insert, update, delete on public.pedagogical_reservations to authenticated;
grant select, insert, update, delete on public.pedagogical_reservation_books to authenticated;

-- Reserva comum: a pessoa vê e cria as próprias; a bibliotecária gerencia todas.
create policy "reservations_select_own_or_librarian" on public.reservations
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_librarian());

create policy "reservations_insert_own" on public.reservations
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'waiting');

create policy "reservations_write_librarian" on public.reservations
  for all to authenticated
  using (public.is_librarian())
  with check (public.is_librarian());

-- Reserva pedagógica: o professor vê e pede as próprias (sempre "pending"); só a bibliotecária decide.
create policy "pedagogical_select_own_or_librarian" on public.pedagogical_reservations
  for select to authenticated
  using (teacher_id = (select auth.uid()) or public.is_librarian());

create policy "pedagogical_insert_teacher" on public.pedagogical_reservations
  for insert to authenticated
  with check (
    teacher_id = (select auth.uid()) and public.is_teacher() and status = 'pending'
  );

create policy "pedagogical_write_librarian" on public.pedagogical_reservations
  for all to authenticated
  using (public.is_librarian())
  with check (public.is_librarian());

-- Livros da reserva pedagógica: seguem a regra da reserva a que pertencem.
create policy "pedagogical_books_select" on public.pedagogical_reservation_books
  for select to authenticated
  using (
    public.is_librarian()
    or exists (
      select 1 from public.pedagogical_reservations r
      where r.id = reservation_id and r.teacher_id = (select auth.uid())
    )
  );

create policy "pedagogical_books_insert_teacher" on public.pedagogical_reservation_books
  for insert to authenticated
  with check (
    exists (
      select 1 from public.pedagogical_reservations r
      where r.id = reservation_id
        and r.teacher_id = (select auth.uid())
        and r.status = 'pending'
    )
  );

create policy "pedagogical_books_write_librarian" on public.pedagogical_reservation_books
  for all to authenticated
  using (public.is_librarian())
  with check (public.is_librarian());
