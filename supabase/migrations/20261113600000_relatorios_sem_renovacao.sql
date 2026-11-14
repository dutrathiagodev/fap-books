-- Migration: os relatórios de reservas pedagógicas deixam de contar os pedidos de renovação (cards 0053 e 0055, RF-29).
-- A renovação é uma linha de pedagogical_reservations com renewal_of e sem livros próprios (20261113500000): contada como
-- "solicitação" inflaria os números e apareceria na lista sem título. O relatório fala de reservas (pedidos de livros);
-- a renovação só estende o prazo de uma reserva que já está na lista.
-- Redefine apenas report_pedagogical e report_pedagogical_counts, iguais às de 20261113300000 (mesmos parâmetros, retorno,
-- security definer, search_path vazio, limites e grants) com o filtro "renewal_of is null". report_overdue e report_inventory
-- não mudam: o inventário conta exemplares guardados pelos livros da reserva, que a renovação não tem.

create or replace function public.report_pedagogical(
  p_from date default null,
  p_to date default null,
  p_status text default 'all',
  p_limit integer default 10,
  p_offset integer default 0
)
returns table (
  reservation_id uuid,
  teacher_name text,
  status text,
  requested_on date,
  start_date date,
  days integer,
  purpose text,
  book_count integer,
  book_titles text[],
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz constant text := 'America/Sao_Paulo';
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 1000);
  v_offset integer := least(greatest(coalesce(p_offset, 0), 0), 100000);
  v_status text := coalesce(p_status, 'all');
begin
  if not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_status not in ('all', 'pending', 'approved', 'rejected', 'returned', 'cancelled') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  return query
  select
    r.id, p.full_name, r.status, (r.created_at at time zone v_tz)::date, r.start_date, r.days, r.purpose,
    (select count(*)::integer from public.pedagogical_reservation_books rb where rb.reservation_id = r.id),
    array(
      select b.title from public.pedagogical_reservation_books rb
      join public.books b on b.id = rb.book_id
      where rb.reservation_id = r.id
      order by b.title
      limit 10
    ),
    count(*) over ()
  from public.pedagogical_reservations r
  join public.profiles p on p.id = r.teacher_id
  where r.renewal_of is null
    and (v_status = 'all' or r.status = v_status)
    and (p_from is null or r.created_at >= (p_from::timestamp at time zone v_tz))
    and (p_to is null or r.created_at < ((p_to + 1)::timestamp at time zone v_tz))
  order by r.created_at desc, r.id
  limit v_limit offset v_offset;
end;
$$;

revoke execute on function public.report_pedagogical(date, date, text, integer, integer) from public, anon;
grant execute on function public.report_pedagogical(date, date, text, integer, integer) to authenticated;

-- Quantas reservas há em cada situação no período (só as situações que aparecem; a tela completa com zeros).
create or replace function public.report_pedagogical_counts(p_from date default null, p_to date default null)
returns table (status text, total bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz constant text := 'America/Sao_Paulo';
begin
  if not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select r.status, count(*)
  from public.pedagogical_reservations r
  where r.renewal_of is null
    and (p_from is null or r.created_at >= (p_from::timestamp at time zone v_tz))
    and (p_to is null or r.created_at < ((p_to + 1)::timestamp at time zone v_tz))
  group by r.status;
end;
$$;

revoke execute on function public.report_pedagogical_counts(date, date) from public, anon;
grant execute on function public.report_pedagogical_counts(date, date) to authenticated;
