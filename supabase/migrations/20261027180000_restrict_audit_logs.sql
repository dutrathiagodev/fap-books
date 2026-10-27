-- Migration: restringe a gravação da auditoria (LGPD, card 0011; vale para o card 0010).
-- Antes, qualquer pessoa logada gravava em audit_logs a ação e os detalhes que quisesse em seu nome.
-- Agora: só ações conhecidas, só entidades conhecidas, "details" só com ids (nunca nome, e-mail ou texto),
-- e quem não é bibliotecária só grava as ações que a própria pessoa faz (reservas).
-- Os "check" entram como "not valid": valem para registros novos e não reexaminam os antigos.

-- "details" só pode ter chaves terminadas em _id e valores que são ids (uuid) ou números.
create function public.audit_details_are_ids(d jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(d) = 'object' and not exists (
    select 1 from jsonb_each(d) as e(key, value)
    where not (
      e.key ~ '_id$'
      and (
        jsonb_typeof(e.value) = 'number'
        or (jsonb_typeof(e.value) = 'string'
            and (e.value #>> '{}') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
      )
    )
  );
$$;

revoke execute on function public.audit_details_are_ids(jsonb) from public, anon;
grant execute on function public.audit_details_are_ids(jsonb) to authenticated;

alter table public.audit_logs
  add constraint audit_logs_action_known check (action in (
    'loan_created', 'loan_returned', 'loan_renewed',
    'reservation_created', 'reservation_cancelled', 'reservation_approved', 'reservation_rejected',
    'pedagogical_requested', 'pedagogical_approved', 'pedagogical_rejected', 'pedagogical_returned',
    'fine_created', 'fine_paid',
    'book_created', 'book_updated', 'book_inactivated', 'book_deleted',
    'profile_created', 'profile_updated'
  )) not valid,
  add constraint audit_logs_entity_known check (entity in (
    'loans', 'fines', 'reservations', 'pedagogical_reservations', 'books', 'profiles'
  )) not valid,
  add constraint audit_logs_details_only_ids check (public.audit_details_are_ids(details)) not valid;

-- Aluno e professor só gravam as ações que eles mesmos fazem; o resto é da bibliotecária.
drop policy "audit_logs_insert_own" on public.audit_logs;

create policy "audit_logs_insert_own" on public.audit_logs
  for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and (
      public.is_librarian()
      or action in ('reservation_created', 'reservation_cancelled', 'pedagogical_requested')
    )
  );
