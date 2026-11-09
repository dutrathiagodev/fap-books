-- Migration: o limite de dias da reserva pedagógica passa a ser uma configuração (card 0218, história 0050, RF-18).
-- Decisão do dono (27/10): 30 dias continua sendo o padrão, mas a funcionária da biblioteca pode alterar sem mexer no código.
-- Hoje o 30 estava fixo em dois lugares: no check da tabela e na função pedagogical_max_days(). Aqui:
--  1. tabela library_settings guarda o limite (padrão 30); todo usuário logado lê, ninguém escreve direto (só pela função);
--  2. pedagogical_max_days() passa a ler a tabela (continua interna: ninguém de fora a executa);
--  3. o check da tabela vira um teto técnico (1 a 365); quem decide o limite do dia é a função de criação do pedido,
--     que já valida contra pedagogical_max_days(). Reservas já criadas não mudam (o limite só vale na criação);
--  4. set_pedagogical_max_days(): só a funcionária altera, de 1 a 365, com registro na auditoria.

create table public.library_settings (
  key text primary key check (key in ('pedagogical_max_days')),
  int_value integer not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint library_settings_pedagogical_max_days_range check (key <> 'pedagogical_max_days' or int_value between 1 and 365)
);

alter table public.library_settings enable row level security;
create policy "library_settings_select" on public.library_settings for select to authenticated using (true);
revoke all on public.library_settings from public, anon, authenticated;
grant select on public.library_settings to authenticated;

insert into public.library_settings (key, int_value) values ('pedagogical_max_days', 30);

-- Lê o limite. "security definer" para funcionar mesmo dentro de funções chamadas por quem não lê a tabela; continua
-- sem execute para o app (o revoke da migration 20261108180000 vale: create or replace mantém os privilégios).
create or replace function public.pedagogical_max_days() returns integer language sql stable security definer set search_path = '' as $$
  select coalesce((select int_value from public.library_settings where key = 'pedagogical_max_days'), 30)
$$;

-- Teto técnico da tabela: o limite do dia é conferido na função de criação do pedido.
alter table public.pedagogical_reservations drop constraint pedagogical_reservations_days_check;
alter table public.pedagogical_reservations add constraint pedagogical_reservations_days_check check (days between 1 and 365);

-- A auditoria só aceita ações e entidades conhecidas (e só ids nos detalhes): acrescenta a nova.
alter table public.audit_logs drop constraint audit_logs_action_known;
alter table public.audit_logs add constraint audit_logs_action_known check (action = any (array[
  'loan_created','loan_returned','loan_renewed','reservation_created','reservation_cancelled','reservation_approved',
  'reservation_rejected','pedagogical_requested','pedagogical_approved','pedagogical_rejected','pedagogical_returned',
  'fine_created','fine_paid','book_created','book_updated','book_inactivated','book_deleted','profile_created',
  'profile_updated','profile_viewed','profile_inactivated','profile_reactivated','library_setting_changed'
])) not valid;
alter table public.audit_logs drop constraint audit_logs_entity_known;
alter table public.audit_logs add constraint audit_logs_entity_known check (entity = any (array[
  'loans','fines','reservations','pedagogical_reservations','books','profiles','library_settings'
])) not valid;

-- Altera o limite. Só a funcionária (public.is_librarian()); o valor novo vale para os próximos pedidos.
create function public.set_pedagogical_max_days(p_days integer) returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if not public.is_librarian() then
    raise exception 'not_allowed' using hint = 'Só a funcionária da biblioteca altera o limite.';
  end if;
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'invalid_max_days' using hint = 'O limite deve ser de 1 a 365 dias.';
  end if;

  update public.library_settings set int_value = p_days, updated_by = v_actor, updated_at = now() where key = 'pedagogical_max_days';

  -- Os detalhes da auditoria só guardam ids (LGPD): o valor novo fica na própria configuração.
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, 'library_setting_changed', 'library_settings', null, '{}'::jsonb);
  return p_days;
end;
$$;

revoke execute on function public.set_pedagogical_max_days(integer) from public, anon;
grant execute on function public.set_pedagogical_max_days(integer) to authenticated;
