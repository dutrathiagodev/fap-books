-- Simula o mínimo do Supabase (papéis e auth.uid()) para testar as migrations num Postgres comum.
-- NÃO rode no projeto real do Supabase. Veja docs/database/modelo-de-dados.md.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public to anon, authenticated;
grant usage on schema auth to authenticated;
