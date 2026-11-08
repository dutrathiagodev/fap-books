-- Multa por atraso (RF-22): R$ 1,00 (100 centavos) por dia de atraso, contado em dias do calendário de Brasília.
-- Roda numa tarefa agendada (.github/workflows/multas-atrasos.yml), NUNCA na leitura de uma tela.
--
-- Idempotente: rodar duas vezes seguidas não muda nada na segunda. Empréstimo devolvido com atraso tem o valor
-- fechado; empréstimo ainda em aberto cresce um dia por dia. Multa já paga (baixa da bibliotecária) nunca é alterada.
-- Em lote: no máximo 500 empréstimos por execução; o que sobrar entra na execução seguinte.

with candidatos as (
  select
    l.id as loan_id,
    l.user_id,
    (coalesce(l.returned_at, now()) at time zone 'America/Sao_Paulo')::date
      - (l.due_at at time zone 'America/Sao_Paulo')::date as dias
  from public.loans l
  where (l.returned_at is null and l.due_at < now())
     or l.returned_at > l.due_at
),
pendentes as (
  select c.loan_id, c.user_id, c.dias
  from candidatos c
  left join public.fines f on f.loan_id = c.loan_id
  where c.dias > 0
    and (f.id is null or (f.paid_at is null and f.days_late <> c.dias))
  order by c.dias desc, c.loan_id
  limit 500
),
gravadas as (
  insert into public.fines (loan_id, user_id, days_late, amount_cents)
  select loan_id, user_id, dias, dias * 100 from pendentes
  on conflict (loan_id) do update
    set days_late = excluded.days_late,
        amount_cents = excluded.amount_cents
    where public.fines.paid_at is null
  returning id, loan_id, (xmax = 0) as criada
),
auditoria as (
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  select null, 'fine_created', 'fines', id, jsonb_build_object('loan_id', loan_id)
  from gravadas
  where criada
  returning 1
)
select
  (select count(*) from gravadas where criada) as multas_criadas,
  (select count(*) from gravadas where not criada) as multas_atualizadas,
  (select count(*) from auditoria) as registros_de_auditoria;
