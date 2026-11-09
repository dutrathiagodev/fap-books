-- Migration: a busca acha o livro pelo ISBN digitado sem hífens (card 0247).
-- O ISBN fica guardado como o bibliotecário digitou (com ou sem hífens, ex.: 978-85-209-1000-0). Quem busca por
-- 9788520910000 não achava, porque o termo não aparece no texto com hífens. Aqui o ISBN também é comparado só com
-- dígitos (e X, dígito de controle do ISBN-10), com índice trigrama como os outros quatro campos da busca.
-- Só acrescenta uma função, um índice e uma condição "ou" na busca: nenhum dado muda e a assinatura não muda.

create function public.isbn_digits(p_isbn text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select lower(regexp_replace(p_isbn, '[^0-9Xx]', '', 'g'));
$$;

revoke execute on function public.isbn_digits(text) from public, anon;
grant execute on function public.isbn_digits(text) to authenticated;

create index idx_books_isbn_digits_trgm on public.books using gin (public.isbn_digits(isbn) extensions.gin_trgm_ops);

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
      or public.isbn_digits(b.isbn) like p_like
    );
$$;
