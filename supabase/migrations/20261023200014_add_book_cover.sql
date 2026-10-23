-- Migration: capa opcional do livro. As telas do acervo (cards 0108, 0113 e 0117) mostram a capa de cada livro.
-- A capa é opcional: sem ela, a tela mostra o placeholder do design system.

alter table public.books add column cover_url text;

comment on column public.books.cover_url is 'Endereço público da capa, no bucket book-covers do Storage. Opcional.';

-- Bucket público para as capas (JPG, PNG ou WebP, até 2 MB). Só a bibliotecária envia ou troca arquivos.
-- Só roda onde existe o Storage (projeto do Supabase); no Postgres de teste sem Storage, avisa e segue.
do $$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'Sem Storage neste banco: bucket book-covers não criado.';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('book-covers', 'book-covers', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;

  -- A leitura pelo endereço público não precisa de policy; esta policy cobre só enviar, trocar e apagar.
  execute $policy$
    create policy "book_covers_write_librarian" on storage.objects
      for all to authenticated
      using (bucket_id = 'book-covers' and public.is_librarian())
      with check (bucket_id = 'book-covers' and public.is_librarian())
  $policy$;
end $$;
