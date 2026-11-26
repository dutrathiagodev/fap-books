-- Relatório de acervo por TÍTULO (card 0072, RF-28: "estoque e quantidade disponível por título").
-- O relatório por categoria (report_inventory) continua; este mostra uma linha por livro ativo.
--
-- Mesma conta do report_inventory: exemplares = quantity; emprestados = empréstimos em aberto; reservados = reservas
-- pedagógicas aprovadas (1 exemplar por livro); disponíveis = o que sobra, sem ficar abaixo de zero.
-- Só livros ATIVOS (livro inativo não empresta; os inativos seguem no relatório por categoria).
-- Cada linha traz os totais do conjunto inteiro (sum_*), como as outras funções report_*: o PostgREST corta em 1000 linhas.
--
-- "security definer" com search_path vazio e is_librarian() logo no começo: outro perfil recebe 42501; anônimo nem executa.

create function public.report_inventory_titles(p_limit integer default 10, p_offset integer default 0)
returns table (
  book_id uuid,
  title text,
  author text,
  book_code text,
  category text,
  copies integer,
  borrowed bigint,
  held bigint,
  available bigint,
  total_count bigint,
  sum_copies bigint,
  sum_borrowed bigint,
  sum_held bigint,
  sum_available bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 1000);
  v_offset integer := least(greatest(coalesce(p_offset, 0), 0), 100000);
begin
  if not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  with open_loans as (
    select l.book_id, count(*) as n from public.loans l where l.returned_at is null group by l.book_id
  ), held as (
    select rb.book_id, count(*) as n
    from public.pedagogical_reservation_books rb
    join public.pedagogical_reservations r on r.id = rb.reservation_id
    where r.status = 'approved'
    group by rb.book_id
  ), per_title as (
    select
      b.id, b.title, b.author, b.code, coalesce(b.category, 'Sem categoria') as category, b.quantity,
      coalesce(o.n, 0)::bigint as borrowed, coalesce(h.n, 0)::bigint as held,
      greatest(b.quantity - coalesce(o.n, 0) - coalesce(h.n, 0), 0)::bigint as available
    from public.books b
    left join open_loans o on o.book_id = b.id
    left join held h on h.book_id = b.id
    where b.status = 'active'
  )
  select
    t.id, t.title, t.author, t.code, t.category, t.quantity, t.borrowed, t.held, t.available,
    count(*) over (), (sum(t.quantity) over ())::bigint, (sum(t.borrowed) over ())::bigint,
    (sum(t.held) over ())::bigint, (sum(t.available) over ())::bigint
  from per_title t
  order by t.title, t.code
  limit v_limit offset v_offset;
end;
$$;

revoke execute on function public.report_inventory_titles(integer, integer) from public, anon;
grant execute on function public.report_inventory_titles(integer, integer) to authenticated;
