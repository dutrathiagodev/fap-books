-- Controle de empréstimo de livros (atividade da disciplina): cada pessoa logada registra os seus próprios empréstimos
-- (título, autor, leitor, categoria, datas), marca como devolvido e exclui. É um caderno pessoal: não mexe em loans,
-- books nem no estoque da biblioteca. Dados só do dono (RLS); a bibliotecária não lê o caderno de ninguém.
-- LGPD: guarda apenas o que a pessoa digita (nome do leitor é texto livre); some junto com o perfil.

create table public.loan_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  book_title text not null check (char_length(btrim(book_title)) between 1 and 200),
  author text not null check (char_length(btrim(author)) between 1 and 120),
  reader_name text not null check (char_length(btrim(reader_name)) between 1 and 120),
  category text not null check (char_length(btrim(category)) between 1 and 60),
  loaned_on date not null,
  due_on date not null,
  returned_on date,
  created_at timestamptz not null default now(),
  constraint loan_records_due_after_loan check (due_on >= loaned_on),
  constraint loan_records_returned_after_loan check (returned_on is null or returned_on >= loaned_on)
);

create index idx_loan_records_user on public.loan_records (user_id, created_at desc);

alter table public.loan_records enable row level security;
grant select, insert, update, delete on public.loan_records to authenticated;

create policy "loan_records_select_own" on public.loan_records
  for select to authenticated using (user_id = (select auth.uid()));
create policy "loan_records_insert_own" on public.loan_records
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "loan_records_update_own" on public.loan_records
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "loan_records_delete_own" on public.loan_records
  for delete to authenticated using (user_id = (select auth.uid()));
