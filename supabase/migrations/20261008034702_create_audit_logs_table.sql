-- Migration: cria a tabela de auditoria (requisito não funcional: quem fez o quê e quando).
-- Só se acrescenta; ninguém edita nem apaga um registro de auditoria.

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,                  -- ex.: loan_created, loan_returned, reservation_approved
  entity text not null,                  -- ex.: loans, books
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_actor_id on public.audit_logs (actor_id);
create index idx_audit_logs_entity on public.audit_logs (entity, entity_id);
create index idx_audit_logs_created_at on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

-- Sem update e sem delete: o registro de auditoria é imutável.
grant select, insert on public.audit_logs to authenticated;

create policy "audit_logs_select_librarian" on public.audit_logs
  for select to authenticated
  using (public.is_librarian());

-- Quem faz a ação grava o próprio registro, e só em nome de si mesmo.
create policy "audit_logs_insert_own" on public.audit_logs
  for insert to authenticated
  with check (actor_id = (select auth.uid()));
