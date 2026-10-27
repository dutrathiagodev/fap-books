-- Simula o mínimo do Supabase (papéis e auth.uid()) para testar as migrations num Postgres comum.
-- NÃO rode no projeto real do Supabase. Veja docs/database/modelo-de-dados.md.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
-- auth.users e auth.identities com as mesmas colunas do Supabase (conferidas no projeto real em 2026-10-24),
-- para o teste de backup e restauração ser fiel. confirmed_at e identities.email são colunas geradas, como no Supabase.
create table auth.users (
  instance_id uuid, id uuid primary key default gen_random_uuid(), aud varchar(255), role varchar(255), email varchar(255),
  encrypted_password varchar(255), email_confirmed_at timestamptz, invited_at timestamptz, confirmation_token varchar(255),
  confirmation_sent_at timestamptz, recovery_token varchar(255), recovery_sent_at timestamptz, email_change_token_new varchar(255),
  email_change varchar(255), email_change_sent_at timestamptz, last_sign_in_at timestamptz, raw_app_meta_data jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb, is_super_admin boolean, created_at timestamptz, updated_at timestamptz,
  phone text, phone_confirmed_at timestamptz, phone_change text, phone_change_token varchar(255), phone_change_sent_at timestamptz,
  confirmed_at timestamptz generated always as (least(email_confirmed_at, phone_confirmed_at)) stored,
  email_change_token_current varchar(255), email_change_confirm_status smallint, banned_until timestamptz,
  reauthentication_token varchar(255), reauthentication_sent_at timestamptz, is_sso_user boolean not null default false,
  deleted_at timestamptz, is_anonymous boolean not null default false
);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public to anon, authenticated;
grant usage on schema auth to authenticated;
-- Storage mínimo (só o que a migration das capas usa): buckets e objects com RLS ligada.
create schema storage;
create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
create table auth.identities (
  provider_id text not null, user_id uuid not null references auth.users(id) on delete cascade, identity_data jsonb not null default '{}'::jsonb,
  provider text not null default 'email', last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz,
  email text generated always as (lower(identity_data ->> 'email')) stored, id uuid primary key default gen_random_uuid()
);
