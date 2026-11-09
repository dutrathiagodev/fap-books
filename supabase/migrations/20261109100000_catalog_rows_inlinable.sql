-- Migration: catalog_rows passa a poder ser "embutida" na consulta que a chama (card 0245, desempenho da busca).
-- Medido com 20 mil livros num Postgres de teste: a busca levava ~230 ms, porque uma função SQL com "set search_path"
-- NÃO é embutida pelo planejador; o filtro de texto era avaliado linha a linha (unaccent 4 vezes por livro) em vez de
-- usar os índices trigrama. Sem o "set search_path" a função é embutida e o filtro usa o índice.
-- É segura sem ele: é interna (ninguém de fora a executa, ver revoke da migration 20261108100100), só roda dentro das
-- funções "security definer" que já têm search_path vazio (herdado na chamada) e todo nome abaixo é qualificado (public.).
-- Mesmas colunas e mesmas regras de antes; o grant não muda com o "create or replace".

create or replace function public.catalog_rows(p_like text, p_category text, p_status text)
returns table (
  id uuid, title text, author text, category text, code text, quantity integer, status text, cover_url text,
  open_loans integer, has_active_reservation boolean, next_due_at timestamptz, situation text
)
language sql
stable
as $$
  select
    b.id, b.title, b.author, b.category, b.code, b.quantity, b.status, b.cover_url,
    coalesce(l.open_loans, 0)::integer,
    (r.book_id is not null),
    l.next_due_at,
    case
      when b.status = 'inactive' then 'inactive'
      when b.quantity - coalesce(l.open_loans, 0) <= 0 then 'unavailable'
      when r.book_id is not null then 'reserved'
      else 'available'
    end
  from public.books b
  left join (
    select book_id, count(*) as open_loans, min(due_at) as next_due_at
    from public.loans where returned_at is null group by book_id
  ) l on l.book_id = b.id
  left join (
    select distinct book_id from public.reservations where status in ('waiting', 'ready')
  ) r on r.book_id = b.id
  where (p_status = 'all' or b.status = p_status)
    and (p_category is null or b.category = p_category)
    and (
      p_like is null
      or public.search_fold(b.title) like p_like
      or public.search_fold(b.author) like p_like
      or public.search_fold(b.code) like p_like
      or public.search_fold(b.isbn) like p_like
    );
$$;
