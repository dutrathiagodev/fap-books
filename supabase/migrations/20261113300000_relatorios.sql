-- Migration: relatórios da bibliotecária (cards 0070 a 0073, 0096 e 0154 a 0156; RF-27 a RF-29).
-- Três consultas de leitura, uma por relatório, mais os números de cada um (totais e contagens por situação):
--   report_overdue(...)           livros em atraso: usuário, livro, dias de atraso e multa estimada
--   report_inventory(...)         acervo: totais por categoria (títulos, exemplares, emprestados, reservados, disponíveis, inativos)
--   report_pedagogical(...)       reservas pedagógicas: por período e situação, com professor e livros
--   report_pedagogical_counts()   quantas reservas há em cada situação no período (os chips da tela)
--
-- Por que função e não consultas da tela: o PostgREST corta leituras em 1000 linhas sem avisar, e os totais precisam somar
-- tudo (não só a página). Cada função devolve a página pedida (p_limit/p_offset) e, em cada linha, os totais do filtro inteiro.
-- Toda função limita o resultado (no máximo 1000 linhas por chamada) e usa índice; nenhuma lê a tabela de empréstimos inteira.
--
-- Os dias contam pelo calendário de Brasília, como a multa (src/domain/fines/fine-rules.ts): dias de atraso = dias corridos
-- entre o dia do prazo e o dia da devolução (ou de hoje, se ainda não devolveu). A multa estimada é dias x fine_cents_per_day()
-- (R$ 1,00 por dia). Nos devolvidos com atraso, é o mesmo valor que return_loan gravou em fines.
--
-- "security definer" lê as tabelas sem depender do RLS; por isso o search_path vazio é obrigatório e cada função confere
-- is_librarian() logo no começo: qualquer outro perfil recebe 42501. Anônimo nem executa (revoke).

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Índices
-- ---------------------------------------------------------------------------------------------------------------------

-- Atrasados que ainda não voltaram: filtra pelo prazo (due_at) sem olhar os empréstimos já devolvidos.
create index idx_loans_open_by_due on public.loans (due_at) where returned_at is null;
-- Devolvidos com atraso (o dia exato é conferido na consulta; o índice só reduz o conjunto).
create index idx_loans_returned_late on public.loans (due_at) where returned_at is not null and returned_at > due_at;
-- Acervo por categoria: a soma por categoria sai só do índice (sem ler as linhas do livro).
create index idx_books_category_status_qty on public.books (category, status) include (quantity);
-- Reservas pedagógicas por período de pedido.
create index idx_pedagogical_reservations_created on public.pedagogical_reservations (created_at desc);

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Livros em atraso (RF-27)
-- ---------------------------------------------------------------------------------------------------------------------

-- p_status: 'open' (em atraso, ainda não devolvido), 'returned' (devolvido com atraso) ou 'all'.
-- p_from/p_to: dia do PRAZO de devolução (inclusive nos dois lados), calendário de Brasília. Nulo = sem limite daquele lado.
create function public.report_overdue(
  p_from date default null,
  p_to date default null,
  p_status text default 'open',
  p_limit integer default 10,
  p_offset integer default 0
)
returns table (
  loan_id uuid,
  user_name text,
  registration text,
  book_title text,
  book_code text,
  due_on date,
  returned_on date,
  days_late integer,
  fine_cents integer,
  total_count bigint,
  total_fine_cents bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz constant text := 'America/Sao_Paulo';
  -- Início de hoje em Brasília, como instante.
  v_today timestamptz := ((now() at time zone 'America/Sao_Paulo')::date)::timestamp at time zone 'America/Sao_Paulo';
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 1000);
  v_offset integer := least(greatest(coalesce(p_offset, 0), 0), 100000);
  v_status text := coalesce(p_status, 'open');
begin
  if not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_status not in ('open', 'returned', 'all') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  return query
  with late as (
    select
      l.id, l.user_id, l.book_id,
      (l.due_at at time zone v_tz)::date as due_day,
      (l.returned_at at time zone v_tz)::date as returned_day,
      ((coalesce(l.returned_at, now()) at time zone v_tz)::date - (l.due_at at time zone v_tz)::date) as late_days
    from public.loans l
    where (
        (v_status in ('open', 'all') and l.returned_at is null and l.due_at < v_today)
        or (v_status in ('returned', 'all') and l.returned_at is not null and l.returned_at > l.due_at)
      )
      and (p_from is null or l.due_at >= (p_from::timestamp at time zone v_tz))
      and (p_to is null or l.due_at < ((p_to + 1)::timestamp at time zone v_tz))
  ),
  counted as (
    select x.*, (x.late_days * public.fine_cents_per_day()) as fine
    from late x
    where x.late_days > 0
  )
  select
    c.id, p.full_name, p.registration, b.title, b.code, c.due_day, c.returned_day, c.late_days::integer, c.fine::integer,
    count(*) over (), coalesce(sum(c.fine) over (), 0)::bigint
  from counted c
  join public.profiles p on p.id = c.user_id
  join public.books b on b.id = c.book_id
  order by c.late_days desc, c.due_day, p.full_name, c.id
  limit v_limit offset v_offset;
end;
$$;

revoke execute on function public.report_overdue(date, date, text, integer, integer) from public, anon;
grant execute on function public.report_overdue(date, date, text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Acervo por categoria (RF-28)
-- ---------------------------------------------------------------------------------------------------------------------

-- Um retrato de hoje: não tem período. Exemplares de livro ATIVO: total, emprestados (empréstimos em aberto), reservados
-- (reservas pedagógicas aprovadas guardam 1 exemplar por livro) e disponíveis (o que sobra, sem ficar abaixo de zero).
-- Livro inativo não empresta: entra só em inactive_titles e inactive_copies. Sem categoria vira "Sem categoria", por último.
create function public.report_inventory(p_limit integer default 10, p_offset integer default 0)
returns table (
  category text,
  titles integer,
  copies bigint,
  borrowed bigint,
  held bigint,
  available bigint,
  inactive_titles integer,
  inactive_copies bigint,
  total_count bigint,
  sum_titles bigint,
  sum_copies bigint,
  sum_borrowed bigint,
  sum_held bigint,
  sum_available bigint,
  sum_inactive_titles bigint,
  sum_inactive_copies bigint
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
  ), per_book as (
    select
      b.category, b.status, b.quantity,
      coalesce(o.n, 0) as borrowed, coalesce(h.n, 0) as held
    from public.books b
    left join open_loans o on o.book_id = b.id and b.status = 'active'
    left join held h on h.book_id = b.id and b.status = 'active'
  ), per_category as (
    select
      coalesce(x.category, 'Sem categoria') as name,
      (count(*) filter (where x.status = 'active'))::integer as titles,
      coalesce(sum(x.quantity) filter (where x.status = 'active'), 0)::bigint as copies,
      coalesce(sum(x.borrowed) filter (where x.status = 'active'), 0)::bigint as borrowed,
      coalesce(sum(x.held) filter (where x.status = 'active'), 0)::bigint as held,
      coalesce(sum(greatest(x.quantity - x.borrowed - x.held, 0)) filter (where x.status = 'active'), 0)::bigint as available,
      (count(*) filter (where x.status = 'inactive'))::integer as inactive_titles,
      coalesce(sum(x.quantity) filter (where x.status = 'inactive'), 0)::bigint as inactive_copies
    from per_book x
    group by coalesce(x.category, 'Sem categoria')
  )
  select
    c.name, c.titles, c.copies, c.borrowed, c.held, c.available, c.inactive_titles, c.inactive_copies,
    count(*) over (), (sum(c.titles) over ())::bigint, (sum(c.copies) over ())::bigint, (sum(c.borrowed) over ())::bigint,
    (sum(c.held) over ())::bigint, (sum(c.available) over ())::bigint, (sum(c.inactive_titles) over ())::bigint,
    (sum(c.inactive_copies) over ())::bigint
  from per_category c
  order by (c.name = 'Sem categoria'), c.name
  limit v_limit offset v_offset;
end;
$$;

revoke execute on function public.report_inventory(integer, integer) from public, anon;
grant execute on function public.report_inventory(integer, integer) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Reservas pedagógicas (RF-29)
-- ---------------------------------------------------------------------------------------------------------------------

-- p_from/p_to: dia em que o pedido foi feito (created_at), calendário de Brasília, inclusive nos dois lados.
-- p_status: 'all' ou um status da reserva (pending, approved, rejected, returned, cancelled).
-- book_titles: até 10 títulos da reserva, em ordem alfabética; book_count é o total de livros dela.
create function public.report_pedagogical(
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
  where (v_status = 'all' or r.status = v_status)
    and (p_from is null or r.created_at >= (p_from::timestamp at time zone v_tz))
    and (p_to is null or r.created_at < ((p_to + 1)::timestamp at time zone v_tz))
  order by r.created_at desc, r.id
  limit v_limit offset v_offset;
end;
$$;

revoke execute on function public.report_pedagogical(date, date, text, integer, integer) from public, anon;
grant execute on function public.report_pedagogical(date, date, text, integer, integer) to authenticated;

-- Quantas reservas há em cada situação no período (só as situações que aparecem; a tela completa com zeros).
create function public.report_pedagogical_counts(p_from date default null, p_to date default null)
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
  where (p_from is null or r.created_at >= (p_from::timestamp at time zone v_tz))
    and (p_to is null or r.created_at < ((p_to + 1)::timestamp at time zone v_tz))
  group by r.status;
end;
$$;

revoke execute on function public.report_pedagogical_counts(date, date) from public, anon;
grant execute on function public.report_pedagogical_counts(date, date) to authenticated;
