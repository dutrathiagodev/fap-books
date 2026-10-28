-- Migration: inscritos na newsletter da landing page (card 0195/0198).
-- LGPD: a base legal é o consentimento da própria pessoa, registrado com data e versão do texto.
-- Regras: docs/architecture/supabase.spec.md (RLS em toda tabela, grant mínimo) e docs/database/lgpd.md.

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  consent_text_version text not null,        -- qual texto de consentimento a pessoa viu (ex.: newsletter-v1)
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,               -- preenchido quando a pessoa pede para sair (não apagamos de imediato)
  -- Mesmo que a tela falhe, o banco recusa dado fora do padrão.
  constraint newsletter_email_format check (
    email = lower(email)
    and char_length(email) <= 254
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint newsletter_name_length check (char_length(full_name) between 2 and 100),
  constraint newsletter_consent_version_format check (consent_text_version ~ '^newsletter-v[0-9]+$')
);

-- Um e-mail só entra uma vez (a tela trata o repetido como sucesso, para não revelar quem já está inscrito).
create unique index newsletter_subscribers_email_key on public.newsletter_subscribers (email);

alter table public.newsletter_subscribers enable row level security;

-- Começa sem acesso nenhum e libera só o necessário.
revoke all on table public.newsletter_subscribers from anon, authenticated;

-- Visitante (sem login) só pode se inscrever, e só nestas colunas: não escolhe a data do consentimento
-- nem marca a si mesmo como descadastrado. Não existe select para ele, então ninguém lê a lista.
grant insert (email, full_name, consent_text_version) on public.newsletter_subscribers to anon, authenticated;
grant select, update, delete on public.newsletter_subscribers to authenticated;

create policy "newsletter_insert_public" on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (unsubscribed_at is null);

-- Só a bibliotecária vê, atualiza (descadastrar) e apaga inscritos.
create policy "newsletter_select_librarian" on public.newsletter_subscribers
  for select to authenticated
  using (public.is_librarian());

create policy "newsletter_update_librarian" on public.newsletter_subscribers
  for update to authenticated
  using (public.is_librarian())
  with check (public.is_librarian());

create policy "newsletter_delete_librarian" on public.newsletter_subscribers
  for delete to authenticated
  using (public.is_librarian());
