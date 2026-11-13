-- Migration: aviso de prazo por e-mail (RF-24, cards 0236, 0062 e 0064).
-- Três peças:
--  1. profiles.email_notices: a pessoa escolhe não receber (LGPD). Padrão: recebe (é aviso do serviço que ela usa).
--     Só ela muda, pela função set_my_email_notices (a policy de update de profiles continua só da bibliotecária).
--  2. loan_email_notices: um registro por empréstimo + situação + prazo. A chave única impede o aviso repetido, mesmo
--     rodando a tarefa duas vezes ou duas execuções ao mesmo tempo. RLS ligado e NENHUMA policy: só as funções abaixo
--     (security definer, só para a chave secreta do servidor) leem e gravam.
--  3. claim_loan_email_notices / finish_loan_email_notice: escolhem em lote (limite por execução) quem precisa de aviso e
--     registram o resultado. Quem envia o e-mail é o servidor do app (rota protegida por segredo), não o banco.
--
-- Situações (dias do calendário de Brasília; empréstimo ainda em aberto):
--   due_soon  vence em 1 ou 2 dias       due_today  vence hoje       overdue  o prazo já passou
-- A chave inclui a data do prazo (due_on): se o prazo mudar numa renovação, a nova data pode ser avisada de novo.
-- Falha de envio: o registro fica sem sent_at e a próxima execução tenta de novo, até p_max_attempts tentativas
-- (com pelo menos 1 hora entre elas, o que também protege de duas execuções simultâneas).

alter table public.profiles
  add column email_notices boolean not null default true;

create table public.loan_email_notices (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id) on delete cascade,
  kind text not null check (kind in ('due_soon', 'due_today', 'overdue')),
  due_on date not null,                          -- dia do prazo (Brasília) a que o aviso se refere
  attempts integer not null default 0 check (attempts >= 0),
  last_attempt_at timestamptz,
  sent_at timestamptz,                           -- preenchido só depois que o provedor aceitou o e-mail
  created_at timestamptz not null default now(),
  constraint loan_email_notices_once unique (loan_id, kind, due_on)
);

alter table public.loan_email_notices enable row level security;
revoke all on public.loan_email_notices from public, anon, authenticated;

-- A auditoria só aceita ações conhecidas (e só ids nos detalhes): acrescenta o envio do aviso.
alter table public.audit_logs drop constraint audit_logs_action_known;
alter table public.audit_logs add constraint audit_logs_action_known check (action = any (array[
  'loan_created','loan_returned','loan_renewed','reservation_created','reservation_cancelled','reservation_approved',
  'reservation_rejected','pedagogical_requested','pedagogical_approved','pedagogical_rejected','pedagogical_returned',
  'fine_created','fine_paid','book_created','book_updated','book_inactivated','book_deleted','profile_created',
  'profile_updated','profile_viewed','profile_inactivated','profile_reactivated','library_setting_changed',
  'loan_notice_sent'
])) not valid;

-- ---------------------------------------------------------------------------------------------------------------------
-- Preferência da pessoa
-- ---------------------------------------------------------------------------------------------------------------------

create function public.set_my_email_notices(p_enabled boolean) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or p_enabled is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.profiles set email_notices = p_enabled where id = v_actor and active;
  if not found then
    raise exception 'profile_not_found' using hint = 'Perfil não encontrado ou inativo.';
  end if;

  -- Só ids na auditoria (LGPD): o valor escolhido fica no próprio perfil.
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, 'profile_updated', 'profiles', v_actor, jsonb_build_object('profile_id', v_actor));
  return p_enabled;
end;
$$;

revoke execute on function public.set_my_email_notices(boolean) from public, anon;
grant execute on function public.set_my_email_notices(boolean) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Seleção em lote
-- ---------------------------------------------------------------------------------------------------------------------

-- Devolve os avisos a enviar agora (no máximo p_limit; teto técnico de 100, que é a cota diária do plano gratuito do Resend).
-- Só entram: empréstimo em aberto, perfil ativo com e-mail e que não pediu para deixar de receber, e aviso ainda não enviado
-- (novo, ou tentativa anterior que falhou, com menos de p_max_attempts tentativas e a última há mais de 1 hora).
-- Ordem: vence hoje, vence em breve, atrasado; dentro de cada grupo, o prazo mais antigo primeiro.
-- p_dry_run = true só lista, sem gravar nada (usado quando o provedor de e-mail não está configurado).
-- p_now existe para o teste fixar a data; a tarefa usa o padrão (agora).
create function public.claim_loan_email_notices(
  p_limit integer default 50,
  p_max_attempts integer default 3,
  p_dry_run boolean default false,
  p_now timestamptz default now()
)
returns table (notice_id uuid, loan_id uuid, kind text, due_at timestamptz, days_late integer, email text, full_name text, role text, book_title text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_max integer := least(greatest(coalesce(p_max_attempts, 3), 1), 10);
  v_today date := (p_now at time zone 'America/Sao_Paulo')::date;
begin
  return query
  with candidatos as (
    select l.id as loan_id, l.due_at, p.email, p.full_name, p.role::text as role, b.title as book_title,
      (l.due_at at time zone 'America/Sao_Paulo')::date as due_on,
      case when (l.due_at at time zone 'America/Sao_Paulo')::date > v_today and (l.due_at at time zone 'America/Sao_Paulo')::date <= v_today + 2 then 'due_soon'
           when (l.due_at at time zone 'America/Sao_Paulo')::date = v_today then 'due_today'
           when (l.due_at at time zone 'America/Sao_Paulo')::date < v_today then 'overdue' end as kind,
      greatest(v_today - (l.due_at at time zone 'America/Sao_Paulo')::date, 0) as days_late
    from public.loans l
    join public.profiles p on p.id = l.user_id
    join public.books b on b.id = l.book_id
    where l.returned_at is null and p.active and p.email_notices and nullif(btrim(p.email), '') is not null
  ),
  escolhidos as (
    select c.*
    from candidatos c
    left join public.loan_email_notices n on n.loan_id = c.loan_id and n.kind = c.kind and n.due_on = c.due_on
    where c.kind is not null
      and (n.id is null or (n.sent_at is null and n.attempts < v_max and n.last_attempt_at < p_now - interval '1 hour'))
    order by case c.kind when 'due_today' then 0 when 'due_soon' then 1 else 2 end, c.due_at, c.loan_id
    limit v_limit
  ),
  reservados as (
    -- A chave única é a trava: se outra execução reservou o mesmo aviso agora, o "where" do update o descarta.
    insert into public.loan_email_notices as n (loan_id, kind, due_on, attempts, last_attempt_at)
    select e.loan_id, e.kind, e.due_on, 1, p_now from escolhidos e
    where not p_dry_run
    on conflict on constraint loan_email_notices_once do update
      set attempts = n.attempts + 1, last_attempt_at = p_now
      where n.sent_at is null and n.attempts < v_max and n.last_attempt_at < p_now - interval '1 hour'
    returning n.id, n.loan_id, n.kind, n.due_on
  )
  select r.id, e.loan_id, e.kind, e.due_at, e.days_late::integer, e.email::text, e.full_name, e.role, e.book_title
  from reservados r
  join escolhidos e on e.loan_id = r.loan_id and e.kind = r.kind and e.due_on = r.due_on
  union all
  select null::uuid, e.loan_id, e.kind, e.due_at, e.days_late::integer, e.email::text, e.full_name, e.role, e.book_title
  from escolhidos e
  where p_dry_run;
end;
$$;

-- Marca o resultado. Só "enviado" grava algo: sent_at e o registro na auditoria (só ids). Falha não muda nada:
-- a tentativa já foi contada na reserva e a próxima execução tenta de novo.
create function public.finish_loan_email_notice(p_notice_id uuid, p_sent boolean) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_loan uuid;
begin
  if not coalesce(p_sent, false) then
    return false;
  end if;

  update public.loan_email_notices set sent_at = now()
  where id = p_notice_id and sent_at is null
  returning loan_id into v_loan;
  if v_loan is null then
    return false;
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (null, 'loan_notice_sent', 'loans', v_loan, jsonb_build_object('loan_id', v_loan, 'notice_id', p_notice_id));
  return true;
end;
$$;

-- Só a chave secreta do servidor (service_role). O app logado e o público não executam.
revoke execute on function public.claim_loan_email_notices(integer, integer, boolean, timestamptz) from public, anon, authenticated;
revoke execute on function public.finish_loan_email_notice(uuid, boolean) from public, anon, authenticated;
grant execute on function public.claim_loan_email_notices(integer, integer, boolean, timestamptz) to service_role;
grant execute on function public.finish_loan_email_notice(uuid, boolean) to service_role;
