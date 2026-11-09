-- Migration: números do painel da bibliotecária (cards 0097, 0158 e 0094).
-- Uma função só devolve os contadores do dia: livros emprestados, atrasos, prazos de hoje e dos próximos dias,
-- exemplares disponíveis, multas em aberto e reservas pedagógicas aguardando aprovação. Só contagens, nunca dados de pessoa.
--
-- Por que função e não várias consultas da tela: o PostgREST corta leituras em 1000 linhas sem avisar, e "disponíveis" soma
-- o acervo todo (quantidade − empréstimos em aberto, livro a livro). Aqui tudo roda no banco, em uma ida só.
--
-- Os dias contam pelo calendário de Brasília, como a multa (src/domain/loans/loan-rules.ts): "atrasado" é prazo em um dia
-- anterior a hoje (devolver no dia do prazo, a qualquer hora, não é atraso); "hoje" é o prazo de hoje; "a vencer" são os
-- próximos p_soon_days dias. O Brasil não tem horário de verão, mas a conta usa o fuso de verdade (America/Sao_Paulo).
--
-- "security definer" lê as tabelas sem depender do RLS; por isso o search_path vazio é obrigatório (evita trocar funções pelo nome)
-- e a função confere is_librarian() logo no começo: qualquer outro perfil recebe 42501.

create function public.panel_summary(p_soon_days integer default 2)
returns table (
  borrowed integer,
  overdue integer,
  due_today integer,
  due_soon integer,
  available_copies bigint,
  open_fines integer,
  open_fines_cents bigint,
  pending_pedagogical integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  -- Início de hoje em Brasília, como instante (timestamptz).
  v_today timestamptz := ((now() at time zone 'America/Sao_Paulo')::date)::timestamp at time zone 'America/Sao_Paulo';
  v_soon_days integer := least(greatest(coalesce(p_soon_days, 2), 1), 30);
begin
  if not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    (select count(*)::integer from public.loans l where l.returned_at is null),
    (select count(*)::integer from public.loans l where l.returned_at is null and l.due_at < v_today),
    (select count(*)::integer from public.loans l
      where l.returned_at is null and l.due_at >= v_today and l.due_at < v_today + interval '1 day'),
    (select count(*)::integer from public.loans l
      where l.returned_at is null
        and l.due_at >= v_today + interval '1 day'
        and l.due_at < v_today + make_interval(days => v_soon_days + 1)),
    -- Exemplares livres: quantidade menos os emprestados, livro a livro, sem ficar abaixo de zero. Só livros ativos.
    (select coalesce(sum(greatest(b.quantity - (
        select count(*) from public.loans l where l.book_id = b.id and l.returned_at is null), 0)), 0)::bigint
      from public.books b where b.status = 'active'),
    (select count(*)::integer from public.fines f where f.paid_at is null),
    (select coalesce(sum(f.amount_cents), 0)::bigint from public.fines f where f.paid_at is null),
    (select count(*)::integer from public.pedagogical_reservations r where r.status = 'pending');
end;
$$;

revoke execute on function public.panel_summary(integer) from public, anon;
grant execute on function public.panel_summary(integer) to authenticated;
