-- Migration: cria o acervo de livros (RF-01 a RF-05).
-- A disponibilidade NÃO é guardada aqui: é calculada (quantity menos os empréstimos em aberto).

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  category text,
  code text not null unique,                      -- código ou ISBN
  quantity integer not null default 1 check (quantity >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger books_set_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

-- Índices para as buscas por título, autor e categoria (RF-04).
create index idx_books_title on public.books (title);
create index idx_books_author on public.books (author);
create index idx_books_category on public.books (category);

alter table public.books enable row level security;

grant select, insert, update, delete on public.books to authenticated;

-- Qualquer usuário logado consulta o acervo.
create policy "books_select_logged_in" on public.books
  for select to authenticated
  using (true);

-- Só a bibliotecária cadastra, edita e exclui livros.
create policy "books_write_librarian" on public.books
  for all to authenticated
  using (public.is_librarian())
  with check (public.is_librarian());
