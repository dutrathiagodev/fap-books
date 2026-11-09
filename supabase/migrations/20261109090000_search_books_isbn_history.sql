-- Migration: a busca do acervo passa a devolver ISBN e "tem histórico" (card 0245, ligação do app à search_books).
-- O app (pesquisa de aluno/professor e acervo da funcionária) vai usar a search_books em vez de ler o acervo na memória:
--   - a pesquisa mostra o ISBN do livro;
--   - o acervo da funcionária precisa saber se o livro já teve empréstimo ou reserva (só inativa, não exclui).
-- Mudar as colunas de retorno exige apagar e criar a função de novo, e repetir o revoke e o grant.
-- O ISBN e o histórico só são buscados para as linhas da PÁGINA (no máximo 50), nunca para o acervo todo.
-- Mesmas regras de antes: filtro, situação, ordem, página além do fim devolve a última, no máximo 50 por página.

drop function public.search_books(text, text, text, text, text, integer, integer);

create function public.search_books(
  p_query text default null,
  p_category text default null,
  p_situation text default 'all',
  p_status text default 'active',
  p_sort text default 'relevance',
  p_page integer default 1,
  p_page_size integer default 12
)
returns table (
  id uuid, title text, author text, category text, code text, quantity integer, status text, cover_url text,
  open_loans integer, has_active_reservation boolean, next_due_at timestamptz, situation text,
  total_count bigint, page_number integer, isbn text, has_history boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_like text := public.catalog_like(p_query);
  v_fold text := public.search_fold(left(btrim(coalesce(p_query, '')), 60));   -- termo puro, para igualdade
  v_esc text := case when v_like is null then '' else substr(v_like, 2, length(v_like) - 2) end;   -- termo escapado, sem os % das pontas
  v_size integer := least(greatest(coalesce(p_page_size, 12), 1), 50);
  v_total bigint;
  v_page integer;
begin
  perform public.catalog_guard(p_status);
  if p_situation not in ('all', 'available', 'reserved', 'unavailable') then
    raise exception 'invalid_situation' using errcode = '22023';
  end if;
  if p_sort not in ('relevance', 'title', 'author', 'available') then
    raise exception 'invalid_sort' using errcode = '22023';
  end if;

  select count(*) into v_total
  from public.catalog_rows(v_like, p_category, p_status) c
  where p_situation = 'all' or c.situation = p_situation;

  v_page := least(greatest(coalesce(p_page, 1), 1), greatest(1, ceil(v_total::numeric / v_size)::integer));

  return query
  with ordered as (
    select c.*,
           row_number() over (
             order by
               case
                 when p_sort = 'available' then
                   case c.situation when 'available' then 0 when 'reserved' then 1 when 'unavailable' then 2 else 3 end
                 when p_sort = 'relevance' and v_like is not null then
                   case
                     when public.search_fold(c.title) = v_fold then 0
                     when public.search_fold(c.title) like v_esc || '%' then 1
                     when public.search_fold(c.title) like '% ' || v_esc || '%' then 2
                     when public.search_fold(c.title) like '%' || v_esc || '%' then 3
                     when public.search_fold(c.author) like '%' || v_esc || '%' then 4
                     else 5
                   end
                 else 0
               end,
               case when p_sort = 'author' then c.author end,
               c.title,
               c.id
           ) as rn
    from public.catalog_rows(v_like, p_category, p_status) c
    where p_situation = 'all' or c.situation = p_situation
  ), page as (
    select o.* from ordered o where o.rn > (v_page - 1) * v_size and o.rn <= v_page::bigint * v_size
  )
  select p.id, p.title, p.author, p.category, p.code, p.quantity, p.status, p.cover_url,
         p.open_loans, p.has_active_reservation, p.next_due_at, p.situation, v_total, v_page,
         b.isbn,
         (exists (select 1 from public.loans l where l.book_id = p.id)
          or exists (select 1 from public.reservations r where r.book_id = p.id)
          or exists (select 1 from public.pedagogical_reservation_books pb where pb.book_id = p.id))
  from page p
  join public.books b on b.id = p.id
  order by p.rn;
end;
$$;

revoke execute on function public.search_books(text, text, text, text, text, integer, integer) from public, anon;
grant execute on function public.search_books(text, text, text, text, text, integer, integer) to authenticated;
