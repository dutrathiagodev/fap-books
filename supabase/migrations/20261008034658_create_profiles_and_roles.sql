-- Migration: cria os perfis de usuário (aluno, professor, funcionário) e as funções de permissão.
-- Regras: docs/architecture/supabase.spec.md (RLS em toda tabela, grant mínimo, policies por perfil).

-- Os três perfis do PRD (seção 4).
create type public.user_role as enum ('student', 'teacher', 'librarian');

-- Atualiza a coluna updated_at sempre que uma linha muda. Usada por várias tabelas.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Um perfil por usuário do login (auth.users). Guarda o nome e o papel da pessoa.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.user_role not null default 'student',
  job_title text,                       -- cargo, só para funcionário (ex.: chefe da biblioteca)
  active boolean not null default true, -- inativar em vez de apagar (RF-09)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_job_title_only_librarian check (role = 'librarian' or job_title is null)
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Funções auxiliares usadas nas policies. "security definer" lê a tabela sem depender do RLS dela;
-- por isso o search_path vazio é obrigatório (evita que alguém troque funções pelo nome).
create function public.is_librarian()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'librarian' and p.active
  );
$$;

create function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'teacher' and p.active
  );
$$;

revoke execute on function public.is_librarian() from public, anon;
revoke execute on function public.is_teacher() from public, anon;
grant execute on function public.is_librarian() to authenticated;
grant execute on function public.is_teacher() to authenticated;

-- Quando alguém cria a conta, o perfil nasce sozinho, sempre como aluno.
-- O papel NUNCA vem do que a pessoa digita no cadastro: só a bibliotecária muda o papel depois.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Segurança: RLS ligado, permissões mínimas e policies.
alter table public.profiles enable row level security;

grant select, insert, update on public.profiles to authenticated;

-- Cada pessoa vê o próprio perfil; a bibliotecária vê todos.
create policy "profiles_select_own_or_librarian" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_librarian());

-- Só a bibliotecária cadastra e altera perfis (inclusive o papel e o cargo).
create policy "profiles_insert_librarian" on public.profiles
  for insert to authenticated
  with check (public.is_librarian());

create policy "profiles_update_librarian" on public.profiles
  for update to authenticated
  using (public.is_librarian())
  with check (public.is_librarian());
